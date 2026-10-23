import type { Summary } from "@/lib/data";

const ITEMS: { key: keyof Summary; label: string; dot: string }[] = [
  { key: "total", label: "전체", dot: "bg-slate-900 dark:bg-slate-100" },
  { key: "inProgress", label: "작업 중", dot: "bg-sky-500" },
  { key: "done", label: "완료", dot: "bg-emerald-500" },
  { key: "queued", label: "대기 중", dot: "bg-amber-500" },
  { key: "error", label: "오류", dot: "bg-rose-500" },
];

export function SummaryBar({ summary }: { summary: Summary }) {
  return (
    <section aria-label="작업 집계" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {ITEMS.map(({ key, label, dot }) => (
        <div
          key={key}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 first:col-span-2 sm:first:col-span-1 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
            {label}
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-50">{summary[key]}</p>
        </div>
      ))}
    </section>
  );
}
