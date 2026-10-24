import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { BLOG_AGENT_NAME, INSTRUCTION_MAX, INSTRUCTION_MIN } from "@/lib/blog/config";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// 업무 지시 등록: 작업(tasks) 한 건을 queued 로 만듭니다. 단계 실행은 /api/tasks/[id]/advance 가 합니다.
export async function POST(request: Request) {
  if (!(await getUser())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { agentId?: unknown; instruction?: unknown } | null;
  const agentId = typeof body?.agentId === "string" ? body.agentId : "";
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  if (!agentId) return NextResponse.json({ error: "직원을 선택하세요." }, { status: 400 });
  if (instruction.length < INSTRUCTION_MIN || instruction.length > INSTRUCTION_MAX) {
    return NextResponse.json(
      { error: `업무 지시는 ${INSTRUCTION_MIN}자 이상 ${INSTRUCTION_MAX.toLocaleString("ko-KR")}자 이하로 입력하세요.` },
      { status: 400 },
    );
  }

  let db;
  try {
    db = getAdminClient();
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const { data: agent, error: agentError } = await db.from("agents").select("id, name").eq("id", agentId).maybeSingle();
  if (agentError) return NextResponse.json({ error: `agents 조회 실패: ${agentError.message}` }, { status: 500 });
  if (!agent) return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
  if (agent.name !== BLOG_AGENT_NAME) {
    return NextResponse.json({ error: `블로그 작성은 현재 ${BLOG_AGENT_NAME}만 지원합니다.` }, { status: 400 });
  }

  const { data: task, error } = await db
    .from("tasks")
    .insert({ agent_id: agent.id, kind: "blog", instruction, status: "queued", attempt: 1, cancel_requested: false })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: `작업 등록 실패: ${error.message}` }, { status: 500 });

  return NextResponse.json({ id: task.id }, { status: 201 });
}
