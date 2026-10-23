export type TaskStatus =
  | "queued"
  | "analyzing"
  | "topic"
  | "research"
  | "writing"
  | "pop"
  | "review"
  | "done"
  | "error"
  | "canceled";

export type StepStatus = "pending" | "running" | "done" | "error";

export interface AgentRow {
  id: string;
  name: string;
  specialty: string | null;
  sort: number | null;
}

export interface TaskRow {
  id: string;
  agent_id: string;
  batch_id: string | null;
  parent_task_id: string | null;
  kind: string | null;
  instruction: string | null;
  topic: string | null;
  status: TaskStatus;
  current_step: string | null;
  started_at: string | null;
  finished_at: string | null;
  heartbeat_at: string | null;
  error_message: string | null;
  attempt: number | null;
  cancel_requested: boolean | null;
  created_at: string;
}

export interface TaskStepRow {
  id: string;
  task_id: string;
  step_key: string;
  label: string | null;
  position: number;
  status: StepStatus;
  started_at: string | null;
  finished_at: string | null;
  summary: string | null;
}

export interface OutputRow {
  id: string;
  task_id: string;
  kind: "intermediate" | "final";
  format: "blog" | "pop" | null;
  content: string | null;
  file_path: string | null;
  version: number | null;
  created_at: string;
}

export function taskTitle(task: Pick<TaskRow, "id" | "topic" | "instruction">): string {
  return task.topic || task.instruction || `작업 ${task.id}`;
}
