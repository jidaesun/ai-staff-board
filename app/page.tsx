import { StaffBoard } from "@/components/staff-board";
import { ThemeToggle } from "@/components/theme-toggle";
import { getEmployees } from "@/lib/employees";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { employees, source } = await getEmployees();

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">AI 직원 현황판</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {employees.length}명의 AI 직원 업무 상태 · {source === "supabase" ? "실시간 연동" : "샘플 데이터"}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <StaffBoard initialEmployees={employees} source={source} />
    </main>
  );
}
