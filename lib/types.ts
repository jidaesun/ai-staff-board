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

// Supabase 테이블 행. 컬럼 이름은 lib/data.ts 의 조회 코드와 함께 관리합니다.
export interface AgentRow {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface TaskRow {
  id: string;
  agent_id: string;
  status: string;
  title?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface TaskStepRow {
  id: string;
  task_id: string;
  status?: string | null;
  name?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface OutputRow {
  id: string;
  task_id: string;
  type?: string | null;
  content?: string | null;
  url?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}
