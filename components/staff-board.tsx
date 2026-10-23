"use client";

import { useEffect, useState } from "react";
import type { EmployeeSource } from "@/lib/employees";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import { getSupabase } from "@/lib/supabase";
import type { AiEmployee } from "@/lib/types";
import { EmployeeCard } from "./employee-card";

export function StaffBoard({
  initialEmployees,
  source,
}: {
  initialEmployees: AiEmployee[];
  source: EmployeeSource;
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [now, setNow] = useState(() => Date.now());

  // "n분 전" 표시를 주기적으로 갱신
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Supabase Realtime 으로 상태 변경 즉시 반영
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || source !== "supabase") return;

    const channel = supabase
      .channel("ai_employees_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_employees" }, (payload) => {
        setEmployees((prev) => {
          if (payload.eventType === "DELETE") {
            return prev.filter((e) => e.id !== (payload.old as Partial<AiEmployee>).id);
          }
          const row = payload.new as AiEmployee;
          const exists = prev.some((e) => e.id === row.id);
          return exists ? prev.map((e) => (e.id === row.id ? row : e)) : [...prev, row];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [source]);

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: employees.filter((e) => e.status === status).length,
  }));

  return (
    <>
      <section aria-label="상태 요약" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map(({ status, count }) => (
          <div
            key={status}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} aria-hidden />
              {STATUS_META[status].label}
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-50">{count}</p>
          </div>
        ))}
      </section>

      <section
        aria-label="AI 직원 목록"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
      >
        {employees.map((employee) => (
          <EmployeeCard key={employee.id} employee={employee} now={now} />
        ))}
      </section>

      {source === "mock" && (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Supabase가 연결되지 않아 샘플 데이터를 표시하고 있습니다. <code>.env.local</code>에 Supabase URL과
          anon key를 설정하세요.
        </p>
      )}
    </>
  );
}
