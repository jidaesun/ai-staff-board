import Link from "next/link";
import type { AgentCardData } from "@/lib/data";
import { formatDateTime, statusDotClass } from "@/lib/status";
import { taskTitle } from "@/lib/types";
import { StatusBadge } from "./status-badge";

export function AgentCard({ data }: { data: AgentCardData }) {
  const { agent, latestTask, taskCount, finalOutputCount } = data;
  const status = latestTask?.status ?? null;

  return (
    <Link
      href={`/agents/${encodeURIComponent(agent.id)}`}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-slate-700"
    >
      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span aria-hidden>{agent.name.slice(0, 2)}</span>
          </div>
          {status && (
            <span
              className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${statusDotClass(status)}`}
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{agent.name}</h2>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{agent.specialty ?? "-"}</p>
        </div>
        {status && <StatusBadge status={status} />}
      </header>

      <div className="mt-4 min-h-[3.5rem] rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
        <p className="text-[11px] font-medium tracking-wide text-slate-400 dark:text-slate-500">최근 작업</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
          {latestTask ? taskTitle(latestTask) : "작업 없음"}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-slate-500 dark:text-slate-400">현재 단계</dt>
          <dd className="truncate font-mono text-slate-900 dark:text-slate-50">{latestTask?.current_step ?? "-"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">시작</dt>
          <dd className="text-slate-900 tabular-nums dark:text-slate-50">{formatDateTime(latestTask?.started_at)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">최종 결과물</dt>
          <dd className="font-semibold text-slate-900 tabular-nums dark:text-slate-50">
            {finalOutputCount.toLocaleString("ko-KR")}건
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500 dark:text-slate-400">전체 작업</dt>
          <dd className="text-slate-900 tabular-nums dark:text-slate-50">{taskCount.toLocaleString("ko-KR")}건</dd>
        </div>
      </dl>

      <footer className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
        {latestTask?.error_message ? (
          <span
            title={latestTask.error_message}
            className="truncate rounded-md bg-rose-50 px-2 py-0.5 font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          >
            ⚠ 오류 메시지 있음
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">오류 메시지 없음</span>
        )}
        <span className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300">
          상세 →
        </span>
      </footer>
    </Link>
  );
}
