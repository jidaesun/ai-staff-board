import { AgentCard } from "@/components/agent-card";
import { ErrorNotice } from "@/components/error-notice";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SummaryBar } from "@/components/summary-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { getBoard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { cards, summary, error } = await getBoard();

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <RealtimeRefresh />
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI 직원 현황판</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">AI 직원 {cards.length}명의 작업 현황</p>
        </div>
        <ThemeToggle />
      </header>

      {error && (
        <div className="mb-6">
          <ErrorNotice message={error} />
        </div>
      )}

      <SummaryBar summary={summary} />

      {!error && cards.length === 0 && (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">agents 테이블에 행이 없습니다.</p>
      )}

      <section
        aria-label="AI 직원 목록"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
      >
        {cards.map((card) => (
          <AgentCard key={card.agent.id} data={card} />
        ))}
      </section>
    </main>
  );
}
