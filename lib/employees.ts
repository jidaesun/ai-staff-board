import { mockEmployees } from "./mock-data";
import { getSupabase } from "./supabase";
import type { AiEmployee } from "./types";

export type EmployeeSource = "supabase" | "mock";

export async function getEmployees(): Promise<{ employees: AiEmployee[]; source: EmployeeSource }> {
  const supabase = getSupabase();
  if (!supabase) return { employees: mockEmployees, source: "mock" };

  const { data, error } = await supabase
    .from("ai_employees")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[ai_employees] Supabase 조회 실패, 샘플 데이터로 대체합니다:", error.message);
    return { employees: mockEmployees, source: "mock" };
  }

  return { employees: data as AiEmployee[], source: "supabase" };
}
