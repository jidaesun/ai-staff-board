import Link from "next/link";
import { notFound } from "next/navigation";
import { ErrorNotice } from "@/components/error-notice";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { StatusBadge } from "@/components/status-badge";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/auth";
import { getAgentDetail } from "@/lib/data";
import { formatDateTime, statusDotClass } from "@/lib/status";
import { taskTitle, type OutputRow, type TaskRow } from "@/lib/types";

export const dynamic = "force-dynamic";

// 이미 디코딩된 값이거나 '%'가 들어간 id 여도 오류가 나지 않도록
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const panel = "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";
const panelTitle = "text-sm font-semibold text-slate-900 dark:text-slate-50";
const muted = "text-sm text-slate-500 dark:text-slate-400";

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { task: taskId } = await searchParams;
  const agentId = safeDecode(id);

  const { agent, tasks, selectedTask, steps, outputs, error } = await getAgentDetail(agentId, taskId);
  if (!agent && !error) notFound();

  const finalCount = outputs.filter((o) => o.kind === "final").length;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RealtimeRefresh />
      <AppHeader back title={agent?.name ?? agentId} subtitle={agent?.specialty} email={user.email} />

      {error && (
        <div className="mb-6">
          <ErrorNotice message={error} />
        </div>
      )}

      {agent && (
        <div className="grid gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[320px_1fr]">
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
                        href={`/agents/${encodeURIComponent(agent.id)}?task=${encodeURIComponent(task.id)}`}
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
              <TaskSummary task={selectedTask} />

              <section className={panel} aria-labelledby="steps-title">
                <h2 id="steps-title" className={panelTitle}>
                  단계 ({steps.length})
                </h2>
                {steps.length === 0 ? (
                  <p className={`mt-3 ${muted}`}>등록된 단계가 없습니다.</p>
                ) : (
                  <ol className="mt-4 space-y-5 border-l border-slate-200 pl-5 dark:border-slate-700">
                    {steps.map((step) => (
                      <li key={step.id} className="relative">
                        <span
                          className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${statusDotClass(step.status)}`}
                          aria-hidden
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {step.label ?? step.step_key}
                          </span>
                          <StatusBadge status={step.status} />
                        </div>
                        {step.summary && (
                          <p className="mt-1 text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">{step.summary}</p>
                        )}
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {formatDateTime(step.started_at)} → {formatDateTime(step.finished_at)}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className={panel} aria-labelledby="outputs-title">
                <h2 id="outputs-title" className={panelTitle}>
                  결과물 ({outputs.length}) · 최종 {finalCount}건
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

function TaskSummary({ task }: { task: TaskRow }) {
  const fields: [string, string][] = [
    ["kind", task.kind ?? "-"],
    ["current_step", task.current_step ?? "-"],
    ["시작", formatDateTime(task.started_at)],
    ["종료", formatDateTime(task.finished_at)],
    ["heartbeat", formatDateTime(task.heartbeat_at)],
    ["시도", task.attempt?.toString() ?? "-"],
    ["취소 요청", task.cancel_requested ? "예" : "아니오"],
    ["생성", formatDateTime(task.created_at)],
  ];

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{taskTitle(task)}</h2>
        <StatusBadge status={task.status} />
      </div>
      {task.topic && task.instruction && (
        <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600 dark:text-slate-300">{task.instruction}</p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-4">
        {fields.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="break-words text-slate-900 dark:text-slate-50">{value}</dd>
          </div>
        ))}
      </dl>
      {task.error_message && (
        <div className="mt-4">
          <ErrorNotice message={task.error_message} />
        </div>
      )}
    </section>
  );
}

function OutputItem({ output }: { output: OutputRow }) {
  const isFinal = output.kind === "final";
  return (
    <li
      className={`rounded-xl border p-4 ${
        isFinal ? "border-emerald-300 dark:border-emerald-500/40" : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-2 font-mono">
          <span className={isFinal ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>{output.kind}</span>
          {output.format && <span>· {output.format}</span>}
          {output.version != null && <span>· v{output.version}</span>}
        </span>
        <span>{formatDateTime(output.created_at)}</span>
      </div>
      {output.file_path && (
        <p className="mt-2 font-mono text-xs break-all text-slate-500 dark:text-slate-400">{output.file_path}</p>
      )}
      {output.content && (
        <pre className="mt-2 max-h-[480px] overflow-auto font-sans text-sm break-words whitespace-pre-wrap text-slate-800 dark:text-slate-100">
          {output.content}
        </pre>
      )}
    </li>
  );
}
