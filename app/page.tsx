import { AgentCard } from "@/components/agent-card";
import { ErrorNotice } from "@/components/error-notice";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { SummaryBar } from "@/components/summary-bar";
import { AppHeader } from "@/components/app-header";
import { InstructionForm } from "@/components/instruction-form";
import { BLOG_AGENT_NAME } from "@/lib/blog/config";
import { requireUser } from "@/lib/auth";
import { getBoard } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const { cards, summary, error } = await getBoard();
  const blogAgent = cards.find((c) => c.agent.name === BLOG_AGENT_NAME)?.agent;

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <RealtimeRefresh />
      <AppHeader title="AI 직원 현황판" subtitle={`AI 직원 ${cards.length}명의 작업 현황`} email={user.email} />

      {error && (
        <div className="mb-6">
          <ErrorNotice message={error} />
        </div>
      )}

      {blogAgent && (
        <div className="mb-6">
          <InstructionForm agentId={blogAgent.id} agentName={blogAgent.name} />
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
