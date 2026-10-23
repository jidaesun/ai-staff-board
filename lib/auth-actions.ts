"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "./auth";
import { createClient } from "./supabase/server";

export interface LoginState {
  error: string | null;
  email: string;
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요.", email };

  const supabase = await createClient();
  if (!supabase) return { error: "Supabase 환경 변수가 설정되지 않았습니다.", email };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message =
      error.code === "invalid_credentials"
        ? "이메일 또는 비밀번호가 올바르지 않습니다."
        : error.code === "email_not_confirmed"
          ? "이메일 인증이 완료되지 않은 계정입니다."
          : `로그인에 실패했습니다: ${error.message}`;
    return { error: message, email };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/login");
}
