import type { Metadata } from "next";
import { ErrorNotice } from "@/components/error-notice";
import { ThemeToggle } from "@/components/theme-toggle";
import { safeNextPath } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인 · AI 직원 현황판" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col px-4 py-6 sm:px-6">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI 직원 현황판</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">계정으로 로그인하세요.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            {!isSupabaseConfigured && (
              <div className="mb-4">
                <ErrorNotice message="Supabase 환경 변수(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다." />
              </div>
            )}
            <LoginForm next={safeNextPath(next)} disabled={!isSupabaseConfigured} />
          </div>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            계정이 필요하면 관리자에게 문의하세요.
          </p>
        </div>
      </div>
    </main>
  );
}
