import { IN_PROGRESS_STATUSES } from "./status";
import { getSupabase } from "./supabase";
import type { AgentRow, OutputRow, TaskRow, TaskStepRow } from "./types";

export interface Summary {
  total: number;
  inProgress: number;
  done: number;
  queued: number;
  error: number;
}

export interface AgentCardData {
  agent: AgentRow;
  latestTask: BoardTask | null;
  taskCount: number;
  finalOutputCount: number;
}

export interface BoardData {
  cards: AgentCardData[];
  summary: Summary;
  error: string | null;
}

const NOT_CONFIGURED = "Supabase가 설정되지 않았습니다. .env.local에 URL과 anon key를 입력하세요.";

const AGENT_COLUMNS = "id, name, specialty, sort";
const BOARD_TASK_COLUMNS =
  "id, agent_id, topic, instruction, status, current_step, started_at, error_message, created_at";

export type BoardTask = Pick<
  TaskRow,
  "id" | "agent_id" | "topic" | "instruction" | "status" | "current_step" | "started_at" | "error_message" | "created_at"
>;

// PostgREST 의 in() 필터가 URL 길이 제한에 걸리지 않도록 나눠서 조회
const IN_CHUNK = 200;
// Supabase 기본 max rows(1000)보다 작게 잡아 페이지 단위로 끝까지 읽음
const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

async function fetchAll<T>(page: (from: number, to: number) => PageResult<T>): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { rows, error: null };
  }
}

export function summarize(tasks: Pick<TaskRow, "status">[]): Summary {
  const count = (pred: (s: string) => boolean) => tasks.filter((t) => pred(t.status)).length;
  return {
    total: tasks.length,
    inProgress: count((s) => IN_PROGRESS_STATUSES.includes(s as TaskRow["status"])),
    done: count((s) => s === "done"),
    queued: count((s) => s === "queued"),
    error: count((s) => s === "error"),
  };
}

export async function getBoard(): Promise<BoardData> {
  const empty: BoardData = { cards: [], summary: summarize([]), error: null };
  const supabase = getSupabase();
  if (!supabase) return { ...empty, error: NOT_CONFIGURED };

  const [agentRes, taskRes] = await Promise.all([
    supabase.from("agents").select(AGENT_COLUMNS).order("sort", { ascending: true }),
    fetchAll<BoardTask>((from, to) =>
      supabase
        .from("tasks")
        .select(BOARD_TASK_COLUMNS)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);
  if (agentRes.error) return { ...empty, error: `agents 조회 실패: ${agentRes.error.message}` };
  if (taskRes.error) return { ...empty, error: `tasks 조회 실패: ${taskRes.error}` };

  const agents = agentRes.data as AgentRow[];
  const agentIds = new Set(agents.map((a) => a.id));
  const tasks = taskRes.rows.filter((t) => agentIds.has(t.agent_id));

  // 최종 결과물(kind='final') 수를 작업 → 직원 순으로 집계
  const finalByTask = new Map<string, number>();
  let error: string | null = null;
  const taskIds = tasks.map((t) => t.id);
  for (let i = 0; i < taskIds.length; i += IN_CHUNK) {
    const chunk = taskIds.slice(i, i + IN_CHUNK);
    const res = await fetchAll<Pick<OutputRow, "task_id">>((from, to) =>
      supabase
        .from("outputs")
        .select("task_id")
        .eq("kind", "final")
        .in("task_id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (res.error) {
      error = `outputs 조회 실패: ${res.error}`;
      break;
    }
    for (const row of res.rows) {
      finalByTask.set(row.task_id, (finalByTask.get(row.task_id) ?? 0) + 1);
    }
  }

  const cards = agents.map((agent) => {
    const own = tasks.filter((t) => t.agent_id === agent.id);
    return {
      agent,
      latestTask: own[0] ?? null,
      taskCount: own.length,
      finalOutputCount: own.reduce((sum, t) => sum + (finalByTask.get(t.id) ?? 0), 0),
    };
  });

  return { cards, summary: summarize(tasks), error };
}

export interface AgentDetail {
  agent: AgentRow | null;
  tasks: TaskRow[];
  selectedTask: TaskRow | null;
  steps: TaskStepRow[];
  outputs: OutputRow[];
  error: string | null;
}

export async function getAgentDetail(agentId: string, taskId?: string): Promise<AgentDetail> {
  const empty: AgentDetail = { agent: null, tasks: [], selectedTask: null, steps: [], outputs: [], error: null };
  const supabase = getSupabase();
  if (!supabase) return { ...empty, error: NOT_CONFIGURED };

  const agentRes = await supabase.from("agents").select(AGENT_COLUMNS).eq("id", agentId).maybeSingle();
  if (agentRes.error) return { ...empty, error: `agents 조회 실패: ${agentRes.error.message}` };
  const agent = agentRes.data as AgentRow | null;
  if (!agent) return empty;

  const taskRes = await supabase
    .from("tasks")
    .select("*")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (taskRes.error) return { ...empty, agent, error: `tasks 조회 실패: ${taskRes.error.message}` };

  const tasks = taskRes.data as TaskRow[];
  const selectedTask = tasks.find((t) => t.id === taskId) ?? tasks[0] ?? null;
  if (!selectedTask) return { ...empty, agent, tasks };

  const [stepRes, outputRes] = await Promise.all([
    supabase.from("task_steps").select("*").eq("task_id", selectedTask.id).order("position", { ascending: true }),
    supabase.from("outputs").select("*").eq("task_id", selectedTask.id).order("created_at", { ascending: true }),
  ]);

  const errors = [
    stepRes.error && `task_steps 조회 실패: ${stepRes.error.message}`,
    outputRes.error && `outputs 조회 실패: ${outputRes.error.message}`,
  ].filter(Boolean);

  return {
    agent,
    tasks,
    selectedTask,
    steps: (stepRes.data as TaskStepRow[] | null) ?? [],
    outputs: (outputRes.data as OutputRow[] | null) ?? [],
    error: errors.length ? errors.join(" / ") : null,
  };
}
