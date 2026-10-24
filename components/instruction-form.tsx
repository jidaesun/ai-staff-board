"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { INSTRUCTION_MAX, INSTRUCTION_MIN } from "@/lib/blog/config";

export function InstructionForm({ agentId, agentName }: { agentId: string; agentName: string }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? `등록 실패 (${res.status})`);
      setInstruction("");
      router.push(`/agents/${encodeURIComponent(agentId)}?task=${encodeURIComponent(data.id)}&run=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPending(false);
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
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {length.toLocaleString("ko-KR")} / {INSTRUCTION_MAX.toLocaleString("ko-KR")}자
        </p>
        <button
          type="submit"
          disabled={pending || length < INSTRUCTION_MIN}
          className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {pending ? "등록 중…" : "지시하기"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
