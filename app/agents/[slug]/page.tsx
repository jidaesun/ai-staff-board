import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorNotice } from "@/components/error-notice";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { StatusBadge } from "@/components/status-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { findFixedAgent } from "@/lib/agents";
import { getAgentDetail } from "@/lib/data";
import { formatDateTime, statusDotClass } from "@/lib/status";
import type { OutputRow, TaskRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const taskTitle = (task: TaskRow) => task.title ?? `작업 ${task.id}`;
const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const panel = "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
const panelTitle = "text-sm font-semibold text-slate-900 dark:text-slate-50";
const muted = "text-sm text-slate-500 dark:text-slate-400";

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { slug } = await params;
  const { task: taskId } = await searchParams;
  const def = findFixedAgent(slug);
  if (!def) notFound();

  const { agent, tasks, selectedTask, steps, outputs, error } = await getAgentDetail(def, taskId);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <RealtimeRefresh />
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
            ← 현황판
          </Link>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
            <span aria-hidden>{def.avatar}</span>
            {def.name}
          </h1>
        </div>
        <ThemeToggle />
      </header>

      {error && (
        <div className="mb-6">
          <ErrorNotice message={error} />
        </div>
      )}

      {!error && !agent && <p className={muted}>agents 테이블에 &quot;{def.name}&quot; 행이 없습니다.</p>}

      {agent && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className={`${panel} h-fit`}>
            <h2 className={panelTitle}>작업 목록 ({tasks.length})</h2>
            {tasks.length === 0 ? (
              <p className={`mt-3 ${muted}`}>작업이 없습니다.</p>
            ) : (
              <ul className="mt-3 -mx-2 max-h-[60vh] space-y-1 overflow-y-auto">
                {tasks.map((task) => {
                  const active = task.id === selectedTask?.id;
                  return (
                    <li key={task.id}>
                      <Link
                        href={`/agents/${def.slug}?task=${encodeURIComponent(task.id)}`}
                        aria-current={active ? "page" : undefined}
                        className={`block rounded-lg px-2 py-2 transition-colors ${
                          active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-sm text-slate-800 dark:text-slate-100">{taskTitle(task)}</span>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(task.created_at)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {selectedTask && (
            <div className="min-w-0 space-y-6">
              <section className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{taskTitle(selectedTask)}</h2>
                  <StatusBadge status={selectedTask.status} />
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  생성 {formatDateTime(selectedTask.created_at)} · 갱신 {formatDateTime(selectedTask.updated_at)}
                </p>
              </section>

              <section className={panel} aria-labelledby="steps-title">
                <h2 id="steps-title" className={panelTitle}>
                  단계 ({steps.length})
                </h2>
                {steps.length === 0 ? (
                  <p className={`mt-3 ${muted}`}>등록된 단계가 없습니다.</p>
                ) : (
                  <ol className="mt-4 space-y-4 border-l border-slate-200 pl-5 dark:border-slate-700">
                    {steps.map((step, i) => (
                      <li key={step.id} className="relative">
                        <span
                          className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${statusDotClass(step.status)}`}
                          aria-hidden
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {step.name ?? `단계 ${i + 1}`}
                          </span>
                          {step.status && <StatusBadge status={step.status} />}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{formatDateTime(step.created_at)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className={panel} aria-labelledby="outputs-title">
                <h2 id="outputs-title" className={panelTitle}>
                  결과물 ({outputs.length})
                </h2>
                {outputs.length === 0 ? (
                  <p className={`mt-3 ${muted}`}>결과물이 없습니다.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {outputs.map((output) => (
                      <OutputItem key={output.id} output={output} />
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function OutputItem({ output }: { output: OutputRow }) {
  return (
    <li className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
        <span className="font-mono">{output.type ?? "output"}</span>
        <span>{formatDateTime(output.created_at)}</span>
      </div>
      {output.content && (
        <pre className="mt-2 max-h-[480px] overflow-auto font-sans text-sm break-words whitespace-pre-wrap text-slate-800 dark:text-slate-100">
          {output.content}
        </pre>
      )}
      {output.url && isHttpUrl(output.url) && (
        <a
          href={output.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm break-all text-sky-600 hover:underline dark:text-sky-400"
        >
          {output.url}
        </a>
      )}
    </li>
  );
}
