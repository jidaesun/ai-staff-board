import type { TaskStatus } from "./types";

export const IN_PROGRESS_STATUSES: TaskStatus[] = ["analyzing", "topic", "research", "writing", "pop", "review"];

const tone = {
  queued: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30",
  active: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-400 dark:ring-sky-400/30",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
  error: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/30",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-400/30",
};

const dot = {
  queued: "bg-amber-500",
  active: "bg-sky-500",
  done: "bg-emerald-500",
  error: "bg-rose-500",
  neutral: "bg-slate-400",
};

function toneOf(status: string | null | undefined): keyof typeof tone {
  if (status === "queued") return "queued";
  if (status === "done") return "done";
  if (status === "error") return "error";
  if (IN_PROGRESS_STATUSES.includes(status as TaskStatus)) return "active";
  return "neutral";
}

// 색상만 상태에 따라 정하고, 표시하는 글자는 DB 값 그대로 씁니다.
export const statusBadgeClass = (status: string | null | undefined) => tone[toneOf(status)];
export const statusDotClass = (status: string | null | undefined) => dot[toneOf(status)];

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
