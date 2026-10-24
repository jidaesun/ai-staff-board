import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminClient, redactSecrets } from "@/lib/supabase/admin";
import type { OutputRow, TaskRow, TaskStatus, TaskStepRow } from "@/lib/types";
import { generateText } from "./claude";
import { ANALYZE_SYSTEM, RESEARCH_SYSTEM, TOPIC_SYSTEM, WRITE_SYSTEM, rewritePrompt, writePrompt } from "./prompts";
import { checkBlog } from "./rules";

interface StepDef {
  key: string;
  label: string;
  status: TaskStatus;
}

export const BLOG_STEPS: StepDef[] = [
  { key: "analyze", label: "업무 분석", status: "analyzing" },
  { key: "topic", label: "주제 선정", status: "topic" },
  { key: "research", label: "자료 조사", status: "research" },
  { key: "write", label: "콘텐츠 작성", status: "writing" },
  { key: "review", label: "결과물 검토", status: "review" },
];

const TERMINAL: TaskStatus[] = ["done", "error", "canceled"];
// API 라우트 maxDuration(300초)보다 넉넉히 길게. 이보다 오래 running 이면 실행이 끊긴 것으로 봄
const STALE_MS = 10 * 60 * 1000;

export type AdvanceResult =
  | { state: "ran"; step: string; status: TaskStatus }
  | { state: "busy"; step: string | null }
  | { state: "finished"; status: TaskStatus }
  | { state: "failed"; step: string | null; error: string };

const now = () => new Date().toISOString();

class StepError extends Error {}

/**
 * 작업을 다음 단계 하나만큼 진행합니다. 한 번 호출에 모델 호출은 최대 한 번이라
 * 서버 요청 하나가 오래 걸리지 않습니다. 화면은 이 함수를 반복 호출하고 DB를 다시 읽습니다.
 */
export async function advanceTask(taskId: string): Promise<AdvanceResult> {
  const db = getAdminClient();

  const task = await one<TaskRow>(db.from("tasks").select("*").eq("id", taskId).maybeSingle(), "작업 조회");
  if (!task) throw new StepError("작업을 찾을 수 없습니다.");
  if (TERMINAL.includes(task.status)) return { state: "finished", status: task.status };

  if (task.cancel_requested) {
    await must(db.from("tasks").update({ status: "canceled", finished_at: now() }).eq("id", task.id), "작업 취소");
    return { state: "finished", status: "canceled" };
  }

  const steps = await many<TaskStepRow>(
    db.from("task_steps").select("*").eq("task_id", task.id).order("position", { ascending: true }),
    "단계 조회",
  );

  const running = steps.find((s) => s.status === "running");
  if (running) {
    const since = Date.parse(task.heartbeat_at ?? running.started_at ?? "");
    if (Number.isFinite(since) && Date.now() - since < STALE_MS) return { state: "busy", step: running.step_key };
    const message = `"${running.label ?? running.step_key}" 단계가 끝나지 않고 중단되었습니다.`;
    await failStep(db, task, running.id, message);
    return { state: "failed", step: running.step_key, error: message };
  }

  const next = BLOG_STEPS[steps.length];
  if (!next) {
    // 모든 단계가 끝났는데 작업 상태만 남은 경우
    await must(db.from("tasks").update({ status: "done", finished_at: now() }).eq("id", task.id), "작업 완료 처리");
    return { state: "finished", status: "done" };
  }

  // 동시에 두 요청이 와도 한쪽만 다음 단계를 맡도록 현재 상태를 조건으로 갱신
  const startedAt = now();
  let claim = db
    .from("tasks")
    .update({
      status: next.status,
      current_step: next.key,
      heartbeat_at: startedAt,
      started_at: task.started_at ?? startedAt,
      error_message: null,
    })
    .eq("id", task.id)
    .eq("status", task.status);
  claim = task.current_step === null ? claim.is("current_step", null) : claim.eq("current_step", task.current_step);
  const claimed = await many<Pick<TaskRow, "id">>(claim.select("id"), "단계 시작");
  if (claimed.length === 0) return { state: "busy", step: task.current_step };

  const step = await one<Pick<TaskStepRow, "id">>(
    db
      .from("task_steps")
      .insert({
        task_id: task.id,
        step_key: next.key,
        label: next.label,
        position: steps.length + 1,
        status: "running",
        started_at: startedAt,
      })
      .select("id")
      .single(),
    "단계 기록",
  );
  if (!step) throw new StepError("단계 기록에 실패했습니다.");

  try {
    const summary = await runStep(db, next.key, task, steps);
    await must(
      db.from("task_steps").update({ status: "done", finished_at: now(), summary }).eq("id", step.id),
      "단계 완료 기록",
    );
    if (next.key === BLOG_STEPS.at(-1)!.key) {
      await must(db.from("tasks").update({ status: "done", finished_at: now() }).eq("id", task.id), "작업 완료 처리");
      return { state: "ran", step: next.key, status: "done" };
    }
    return { state: "ran", step: next.key, status: next.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failStep(db, task, step.id, message);
    return { state: "failed", step: next.key, error: message };
  }
}

// 오류는 이 작업과 단계에만 기록
async function failStep(db: SupabaseClient, task: TaskRow, stepId: string, raw: string) {
  const message = redactSecrets(raw);
  const at = now();
  await db.from("task_steps").update({ status: "error", finished_at: at, summary: message }).eq("id", stepId);
  await db.from("tasks").update({ status: "error", error_message: message, finished_at: at }).eq("id", task.id);
}

async function runStep(db: SupabaseClient, key: string, task: TaskRow, prev: TaskStepRow[]): Promise<string> {
  const summaryOf = (k: string) => prev.find((s) => s.step_key === k)?.summary ?? "";
  const instruction = task.instruction ?? "";

  switch (key) {
    case "analyze":
      return generateText({ system: ANALYZE_SYSTEM, prompt: instruction, effort: "low", maxTokens: 4000 });

    case "topic": {
      const raw = await generateText({
        system: TOPIC_SYSTEM,
        prompt: `업무 지시:\n${instruction}\n\n업무 분석:\n${summaryOf("analyze")}`,
        effort: "low",
        maxTokens: 2000,
      });
      const topic = raw.split("\n")[0].replace(/^["'“”「『]+|["'“”」』]+$/g, "").trim();
      await must(db.from("tasks").update({ topic }).eq("id", task.id), "주제 저장");
      return topic;
    }

    case "research":
      return generateText({
        system: RESEARCH_SYSTEM,
        prompt: `주제: ${summaryOf("topic")}\n\n업무 분석:\n${summaryOf("analyze")}`,
        effort: "medium",
        maxTokens: 16000,
        webSearch: true,
      });

    case "write": {
      const draft = await generateText({
        system: WRITE_SYSTEM,
        prompt: writePrompt({
          instruction,
          analysis: summaryOf("analyze"),
          topic: summaryOf("topic"),
          research: summaryOf("research"),
        }),
        effort: "medium",
        maxTokens: 16000,
      });
      await saveOutput(db, task.id, "intermediate", draft, 1);
      return `초안 v1 작성 (본문 공백 제외 ${checkBlog(draft).bodyChars.toLocaleString("ko-KR")}자)`;
    }

    case "review":
      return reviewDraft(db, task);

    default:
      throw new StepError(`알 수 없는 단계: ${key}`);
  }
}

// 초안을 규칙으로 검사하고, 어긋나면 한 번만 다시 쓰게 한 뒤 다시 검사
async function reviewDraft(db: SupabaseClient, task: TaskRow): Promise<string> {
  const drafts = await many<OutputRow>(
    db
      .from("outputs")
      .select("*")
      .eq("task_id", task.id)
      .eq("kind", "intermediate")
      .eq("format", "blog")
      .order("version", { ascending: false })
      .limit(1),
    "초안 조회",
  );
  const draft = drafts[0];
  if (!draft?.content) throw new StepError("검토할 초안이 없습니다.");

  const version = draft.version ?? 1;
  const first = checkBlog(draft.content);
  if (first.ok) {
    await saveOutput(db, task.id, "final", draft.content, version);
    return `v${version} 규칙 검증 통과 (본문 ${first.bodyChars.toLocaleString("ko-KR")}자, 해시태그 ${first.hashtags.length}개)`;
  }

  const log = [`v${version} 규칙 위반: ${first.violations.join(" / ")}`];
  const rewritten = await generateText({
    system: WRITE_SYSTEM,
    prompt: rewritePrompt(draft.content, first.violations),
    effort: "medium",
    maxTokens: 16000,
  });
  await saveOutput(db, task.id, "intermediate", rewritten, version + 1);

  const second = checkBlog(rewritten);
  if (!second.ok) {
    log.push(`재작성 v${version + 1}도 규칙 위반: ${second.violations.join(" / ")}`);
    throw new StepError(log.join("\n"));
  }
  await saveOutput(db, task.id, "final", rewritten, version + 1);
  log.push(`재작성 v${version + 1} 규칙 검증 통과 (본문 ${second.bodyChars.toLocaleString("ko-KR")}자, 해시태그 ${second.hashtags.length}개)`);
  return log.join("\n");
}

async function saveOutput(db: SupabaseClient, taskId: string, kind: OutputRow["kind"], content: string, version: number) {
  await must(db.from("outputs").insert({ task_id: taskId, kind, format: "blog", content, version }), "결과물 저장");
}

type Query<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;

async function one<T>(query: Query<T>, what: string): Promise<T | null> {
  const { data, error } = await query;
  if (error) throw new StepError(`${what} 실패: ${error.message}`);
  return data;
}
async function many<T>(query: Query<T[]>, what: string): Promise<T[]> {
  return (await one(query, what)) ?? [];
}
async function must(query: PromiseLike<{ error: { message: string } | null }>, what: string) {
  const { error } = await query;
  if (error) throw new StepError(`${what} 실패: ${error.message}`);
}
