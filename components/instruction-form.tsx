"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ApiError, INSTRUCTION_MAX, INSTRUCTION_MIN } from "@/lib/blog/config";

const CAUSE: Record<ApiError["code"], string> = {
  unauthorized: "로그인 필요",
  bad_request: "입력 확인",
  unsupported_agent: "지원하지 않는 직원",
  config_missing_url: "서버 설정: URL 없음",
  config_missing_key: "서버 설정: service role 키 없음",
  config_wrong_key: "서버 설정: 잘못된 키 종류",
  config_old_sdk: "서버 설정: supabase-js 버전",
  supabase_error: "Supabase 오류",
  agent_not_found: "행 없음",
};

interface Health {
  supabaseUrl: { set: boolean; host: string | null };
  serviceRoleKey: { kind: string; ok: boolean; label: string; cleaned: boolean; message: string | null };
  anthropicApiKey: { set: boolean };
  supabaseJs: { version: string; supportsNewApiKeys: boolean };
  blogAgent: { state: string; detail: string };
}

export function InstructionForm({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(false);
  const length = instruction.trim().length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, instruction }),
      });
      const data = (await res.json().catch(() => null)) as ({ id?: string } & Partial<ApiError>) | null;
      if (!res.ok || !data?.id) {
        setError({
          code: data?.code ?? "supabase_error",
          error: data?.error ?? `등록 실패 (HTTP ${res.status})`,
          detail: data?.detail,
        });
        setPending(false);
        return;
      }
      setInstruction("");
      router.push(`/agents/${encodeURIComponent(agentId)}?task=${encodeURIComponent(data.id)}&run=1`);
    } catch (e) {
      setError({ code: "bad_request", error: `서버에 연결하지 못했습니다: ${e instanceof Error ? e.message : String(e)}` });
      setPending(false);
    }
  }

  async function checkSettings() {
    setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      setHealth(res.ok ? ((await res.json()) as Health) : null);
    } finally {
      setChecking(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <label htmlFor="instruction" className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        업무 지시 · {agentName} 블로그 작성
      </label>
      <textarea
        id="instruction"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={3}
        maxLength={INSTRUCTION_MAX}
        placeholder="예: 신혼부부를 위한 4도어 냉장고 고르는 법을 블로그 글로 써 줘"
        className="mt-3 block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 focus:outline-none sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span>
            {length.toLocaleString("ko-KR")} / {INSTRUCTION_MAX.toLocaleString("ko-KR")}자
          </span>
          <button
            type="button"
            onClick={checkSettings}
            disabled={checking}
            className="underline underline-offset-2 hover:text-slate-600 disabled:opacity-50 dark:hover:text-slate-300"
          >
            {checking ? "점검 중…" : "서버 설정 점검"}
          </button>
        </div>
        <button
          type="submit"
          disabled={pending || length < INSTRUCTION_MIN}
          className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {pending ? "등록 중…" : "지시하기"}
        </button>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <p>
            <span className="mr-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold dark:bg-rose-500/20">
              {CAUSE[error.code] ?? error.code}
            </span>
            {error.error}
          </p>
          {error.detail && <p className="mt-1 text-xs break-words whitespace-pre-wrap opacity-80">{error.detail}</p>}
        </div>
      )}

      {health && <HealthReport health={health} />}
    </form>
  );
}

function HealthReport({ health }: { health: Health }) {
  const rows: [string, boolean, string][] = [
    ["NEXT_PUBLIC_SUPABASE_URL", health.supabaseUrl.set, health.supabaseUrl.host ?? "없음"],
    [
      "SUPABASE_SERVICE_ROLE_KEY",
      health.serviceRoleKey.ok,
      `${health.serviceRoleKey.label}${health.serviceRoleKey.cleaned ? " · 앞뒤 공백/따옴표 제거함" : ""}${
        health.serviceRoleKey.message ? ` · ${health.serviceRoleKey.message}` : ""
      }`,
    ],
    ["ANTHROPIC_API_KEY", health.anthropicApiKey.set, health.anthropicApiKey.set ? "있음" : "없음"],
    [
      "@supabase/supabase-js",
      health.supabaseJs.supportsNewApiKeys,
      `${health.supabaseJs.version} · sb_secret_ 키 ${health.supabaseJs.supportsNewApiKeys ? "지원" : "지원 확인 안 됨"}`,
    ],
    ["agents 조회 (service role)", health.blogAgent.state === "found", health.blogAgent.detail],
  ];
  return (
    <dl className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 text-xs dark:divide-slate-800 dark:border-slate-800">
      {rows.map(([name, ok, detail]) => (
        <div key={name} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:gap-3">
          <dt className="flex shrink-0 items-center gap-1.5 font-mono text-slate-600 sm:w-56 dark:text-slate-300">
            <span aria-hidden>{ok ? "✅" : "❌"}</span>
            {name}
          </dt>
          <dd className="break-words text-slate-500 dark:text-slate-400">{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
