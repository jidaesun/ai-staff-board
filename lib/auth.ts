import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

// proxy.ts 와 별개로 페이지에서도 한 번 더 확인합니다.
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

// 로그인 후 돌아갈 경로. 다른 사이트로 보내는 값은 무시합니다.
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
