export type EmployeeStatus = "working" | "idle" | "offline" | "error";

export interface AiEmployee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: EmployeeStatus;
  current_task: string | null;
  tasks_completed: number;
  success_rate: number;
  last_active_at: string;
}
