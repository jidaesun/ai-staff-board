import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { BLOG_AGENT_ID } from "@/lib/blog/config";
import {
  AdminConfigError,
  describeSupabaseError,
  getAdminClient,
  inspectServiceRoleKey,
  supabaseHost,
  supabaseJsVersion,
  supportsNewApiKeys,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 서버 설정 점검. 키 값은 절대 내보내지 않고 있는지, 어떤 종류인지만 알려 줍니다.
export async function GET() {
  if (!(await getUser())) return NextResponse.json({ code: "unauthorized", error: "로그인이 필요합니다." }, { status: 401 });

  const key = inspectServiceRoleKey();
  let blogAgent: { state: "found" | "not_found" | "supabase_error" | "config_error"; detail: string };
  try {
    const { data, error } = await getAdminClient().from("agents").select("id").eq("id", BLOG_AGENT_ID).maybeSingle();
    blogAgent = error
      ? { state: "supabase_error", detail: describeSupabaseError(error) }
      : data
        ? { state: "found", detail: `agents.id='${BLOG_AGENT_ID}' 행을 찾았습니다.` }
        : { state: "not_found", detail: `조회는 성공했지만 agents.id='${BLOG_AGENT_ID}' 행이 없습니다 (0행).` };
  } catch (error) {
    blogAgent = {
      state: "config_error",
      detail: error instanceof AdminConfigError ? error.message : "Supabase 클라이언트를 만들지 못했습니다.",
    };
  }

  return NextResponse.json({
    supabaseUrl: { set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), host: supabaseHost() },
    serviceRoleKey: { kind: key.kind, ok: key.ok, label: key.label, cleaned: key.cleaned, message: key.message },
    anthropicApiKey: { set: Boolean(process.env.ANTHROPIC_API_KEY?.trim()) },
    supabaseJs: { version: supabaseJsVersion, supportsNewApiKeys },
    blogAgent,
  });
}
