import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { advanceTask } from "@/lib/blog/pipeline";
import { getAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
// 한 번 호출에 한 단계(모델 호출 최대 1회)만 실행
export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getUser())) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await params;

  try {
    return NextResponse.json(await advanceTask(id));
  } catch (error) {
    // 단계 밖에서 난 오류도 이 작업에만 기록 (이미 끝난 작업은 건드리지 않음)
    const message = error instanceof Error ? error.message : String(error);
    try {
      await getAdminClient()
        .from("tasks")
        .update({ status: "error", error_message: message, finished_at: new Date().toISOString() })
        .eq("id", id)
        .not("status", "in", "(done,error,canceled)");
    } catch {
      // service role 키가 없으면 기록할 수 없음
    }
    return NextResponse.json({ state: "failed", step: null, error: message }, { status: 500 });
  }
}
