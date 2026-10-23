import type { EmployeeStatus } from "./types";

export const STATUS_META: Record<
  EmployeeStatus,
  { label: string; dot: string; badge: string; bar: string }
> = {
  working: {
    label: "업무 중",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/30",
    bar: "bg-emerald-500",
  },
  idle: {
    label: "대기",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-400/30",
    bar: "bg-amber-500",
  },
  error: {
    label: "오류",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/30",
    bar: "bg-rose-500",
  },
  offline: {
    label: "오프라인",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-500/10 dark:text-slate-400 dark:ring-slate-400/30",
    bar: "bg-slate-400",
  },
};

export const STATUS_ORDER: EmployeeStatus[] = ["working", "idle", "error", "offline"];

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
