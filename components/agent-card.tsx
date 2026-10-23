import Link from "next/link";
import type { AgentCardData } from "@/lib/data";
import { formatDateTime, statusDotClass } from "@/lib/status";
import { StatusBadge } from "./status-badge";

export function AgentCard({ data }: { data: AgentCardData }) {
  const { def, agent, latestTask, taskCount } = data;
  const status = latestTask?.status ?? null;

  return (
    <Link
      href={`/agents/${def.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-slate-700"
    >
      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-800">
            <span aria-hidden>{def.avatar}</span>
          </div>
          {status && (
            <span
              className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${statusDotClass(status)}`}
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{def.name}</h2>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {agent ? `작업 ${taskCount.toLocaleString("ko-KR")}건` : "agents 테이블에 없음"}
          </p>
        </div>
        {status && <StatusBadge status={status} />}
      </header>

      <div className="mt-4 min-h-[3.5rem] rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
        <p className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">최근 작업</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
          {latestTask ? (latestTask.title ?? `작업 ${latestTask.id}`) : "작업 없음"}
        </p>
      </div>

      <footer className="mt-auto flex items-center justify-between pt-4 text-xs text-slate-400 dark:text-slate-500">
        <span>갱신 {formatDateTime(latestTask?.updated_at ?? latestTask?.created_at)}</span>
        <span className="transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300">
          상세 →
        </span>
      </footer>
    </Link>
  );
}
