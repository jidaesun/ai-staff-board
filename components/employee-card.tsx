import { STATUS_META, formatRelative } from "@/lib/status";
import type { AiEmployee } from "@/lib/types";

export function EmployeeCard({ employee, now }: { employee: AiEmployee; now: number }) {
  const meta = STATUS_META[employee.status];
  const successRate = Number(employee.success_rate);

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-slate-700">
      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl dark:bg-slate-800">
            <span aria-hidden>{employee.avatar}</span>
          </div>
          <span
            className={`absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${meta.dot} ${
              employee.status === "working" ? "animate-pulse" : ""
            }`}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{employee.name}</h2>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{employee.role}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.badge}`}>
          {meta.label}
        </span>
      </header>

      <div className="mt-4 min-h-[3.5rem] rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
        <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">현재 작업</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
          {employee.current_task ?? "할당된 작업 없음"}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">완료 작업</dt>
          <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums dark:text-slate-50">
            {employee.tasks_completed.toLocaleString("ko-KR")}건
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">성공률</dt>
          <dd className="mt-0.5 font-semibold text-slate-900 tabular-nums dark:text-slate-50">
            {successRate.toFixed(1)}%
          </dd>
        </div>
      </dl>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-label={`${employee.name} 성공률`}
        aria-valuenow={successRate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${successRate}%` }} />
      </div>

      <footer className="mt-auto pt-4 text-xs text-slate-400 dark:text-slate-500">
        마지막 활동{" "}
        <time dateTime={employee.last_active_at} suppressHydrationWarning>
          {formatRelative(employee.last_active_at, now)}
        </time>
      </footer>
    </article>
  );
}
