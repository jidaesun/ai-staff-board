import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { type ApiError, BLOG_AGENT_ID, INSTRUCTION_MAX, INSTRUCTION_MIN } from "@/lib/blog/config";
import {
  AdminConfigError,
  describeSupabaseError,
  getAdminClient,
  inspectServiceRoleKey,
  supabaseHost,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

const fail = (status: number, body: ApiError) => NextResponse.json(body, { status });

// 업무 지시 등록: 작업(tasks) 한 건을 queued 로 만듭니다. 단계 실행은 /api/tasks/[id]/advance 가 합니다.
export async function POST(request: Request) {
  if (!(await getUser())) return fail(401, { code: "unauthorized", error: "로그인이 필요합니다." });

  const body = (await request.json().catch(() => null)) as { agentId?: unknown; instruction?: unknown } | null;
  const agentId = typeof body?.agentId === "string" ? body.agentId : BLOG_AGENT_ID;
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  if (agentId !== BLOG_AGENT_ID) {
    return fail(400, { code: "unsupported_agent", error: `블로그 작성은 현재 agents.id='${BLOG_AGENT_ID}' 직원만 지원합니다.` });
  }
  if (instruction.length < INSTRUCTION_MIN || instruction.length > INSTRUCTION_MAX) {
    return fail(400, {
      code: "bad_request",
      error: `업무 지시는 ${INSTRUCTION_MIN}자 이상 ${INSTRUCTION_MAX.toLocaleString("ko-KR")}자 이하로 입력하세요.`,
    });
  }

  let db;
  try {
    db = getAdminClient();
  } catch (error) {
    if (error instanceof AdminConfigError) return fail(500, { code: error.code, error: error.message });
    throw error;
  }

  const { data: agent, error: agentError } = await db.from("agents").select("id, name").eq("id", BLOG_AGENT_ID).maybeSingle();
  if (agentError) {
    return fail(502, {
      code: "supabase_error",
      error: `agents 조회 중 Supabase 오류가 났습니다 (id='${BLOG_AGENT_ID}').`,
      detail: describeSupabaseError(agentError),
    });
  }
  if (!agent) {
    return fail(404, {
      code: "agent_not_found",
      error: `agents 테이블에 id='${BLOG_AGENT_ID}' 행이 없습니다.`,
      detail: `조회는 오류 없이 끝났고 결과가 0행입니다. 사용한 키: ${inspectServiceRoleKey().label}, 프로젝트: ${supabaseHost() ?? "-"}`,
    });
  }

  const { data: task, error } = await db
    .from("tasks")
    .insert({ agent_id: agent.id, kind: "blog", instruction, status: "queued", attempt: 1, cancel_requested: false })
    .select("id")
    .single();
  if (error) {
    return fail(502, { code: "supabase_error", error: "tasks 등록 중 Supabase 오류가 났습니다.", detail: describeSupabaseError(error) });
  }

  return NextResponse.json({ id: task.id }, { status: 201 });
}
