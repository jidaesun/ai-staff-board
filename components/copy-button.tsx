"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      // http 접속 등 clipboard API 를 못 쓰는 환경
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      setState(document.execCommand("copy") ? "copied" : "failed");
      area.remove();
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="h-8 rounded-lg border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none dark:border-emerald-500/40 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
    >
      {state === "copied" ? "복사됨" : state === "failed" ? "복사 실패" : "복사"}
    </button>
  );
}
