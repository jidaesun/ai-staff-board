import { FIXED_AGENTS, type FixedAgent } from "./agents";
import { IN_PROGRESS_STATUSES } from "./status";
import { getSupabase } from "./supabase";
import type { AgentRow, OutputRow, TaskRow, TaskStatus, TaskStepRow } from "./types";

export interface Summary {
  total: number;
  inProgress: number;
  done: number;
  queued: number;
  error: number;
}

export interface AgentCardData {
  def: FixedAgent;
  agent: AgentRow | null;
  latestTask: TaskRow | null;
  taskCount: number;
}

export interface BoardData {
  cards: AgentCardData[];
  summary: Summary;
  error: string | null;
}

const NOT_CONFIGURED = "Supabase가 설정되지 않았습니다. .env.local에 URL과 anon key를 입력하세요.";

export function summarize(tasks: Pick<TaskRow, "status">[]): Summary {
  const count = (pred: (s: string) => boolean) => tasks.filter((t) => pred(t.status)).length;
  return {
    total: tasks.length,
    inProgress: count((s) => IN_PROGRESS_STATUSES.includes(s as TaskStatus)),
    done: count((s) => s === "done"),
    queued: count((s) => s === "queued"),
    error: count((s) => s === "error"),
  };
}

const emptyCards = (): AgentCardData[] =>
  FIXED_AGENTS.map((def) => ({ def, agent: null, latestTask: null, taskCount: 0 }));

async function getFixedAgentRows(): Promise<{ rows: AgentRow[]; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { rows: [], error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .in(
      "name",
      FIXED_AGENTS.map((a) => a.name),
    );
  if (error) return { rows: [], error: `agents 조회 실패: ${error.message}` };
  return { rows: data as AgentRow[], error: null };
}

export async function getBoard(): Promise<BoardData> {
  const supabase = getSupabase();
  const { rows: agents, error: agentError } = await getFixedAgentRows();
  if (!supabase || agentError) {
    return { cards: emptyCards(), summary: summarize([]), error: agentError };
  }

  let tasks: TaskRow[] = [];
  let error: string | null = null;
  if (agents.length > 0) {
    const res = await supabase
      .from("tasks")
      .select("*")
      .in(
        "agent_id",
        agents.map((a) => a.id),
      )
      .order("created_at", { ascending: false });
    if (res.error) error = `tasks 조회 실패: ${res.error.message}`;
    else tasks = res.data as TaskRow[];
  }

  const cards = FIXED_AGENTS.map((def) => {
    const agent = agents.find((a) => a.name === def.name) ?? null;
    const own = agent ? tasks.filter((t) => t.agent_id === agent.id) : [];
    return { def, agent, latestTask: own[0] ?? null, taskCount: own.length };
  });

  return { cards, summary: summarize(tasks), error };
}

export interface AgentDetail {
  agent: AgentRow | null;
  tasks: TaskRow[];
  selectedTask: TaskRow | null;
  steps: TaskStepRow[];
  outputs: OutputRow[];
  error: string | null;
}

export async function getAgentDetail(def: FixedAgent, taskId?: string): Promise<AgentDetail> {
  const empty: AgentDetail = { agent: null, tasks: [], selectedTask: null, steps: [], outputs: [], error: null };
  const supabase = getSupabase();
  const { rows, error: agentError } = await getFixedAgentRows();
  if (!supabase || agentError) return { ...empty, error: agentError };

  const agent = rows.find((a) => a.name === def.name) ?? null;
  if (!agent) return empty;

  const taskRes = await supabase
    .from("tasks")
    .select("*")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (taskRes.error) return { ...empty, agent, error: `tasks 조회 실패: ${taskRes.error.message}` };

  const tasks = taskRes.data as TaskRow[];
  const selectedTask = tasks.find((t) => t.id === taskId) ?? tasks[0] ?? null;
  if (!selectedTask) return { ...empty, agent, tasks };

  const [stepRes, outputRes] = await Promise.all([
    supabase.from("task_steps").select("*").eq("task_id", selectedTask.id).order("created_at", { ascending: true }),
    supabase.from("outputs").select("*").eq("task_id", selectedTask.id).order("created_at", { ascending: true }),
  ]);

  const errors = [
    stepRes.error && `task_steps 조회 실패: ${stepRes.error.message}`,
    outputRes.error && `outputs 조회 실패: ${outputRes.error.message}`,
  ].filter(Boolean);

  return {
    agent,
    tasks,
    selectedTask,
    steps: (stepRes.data as TaskStepRow[] | null) ?? [],
    outputs: (outputRes.data as OutputRow[] | null) ?? [],
    error: errors.length ? errors.join(" / ") : null,
  };
}
