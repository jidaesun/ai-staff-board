import type { AiEmployee } from "./types";

// Supabase 환경 변수가 없을 때 사용하는 샘플 데이터 (supabase/migrations 시드와 동일)
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const mockEmployees: AiEmployee[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "아리아",
    role: "고객 지원 상담원",
    avatar: "🎧",
    status: "working",
    current_task: "환불 문의 티켓 12건 응대 중",
    tasks_completed: 1284,
    success_rate: 97.2,
    last_active_at: minutesAgo(1),
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "코디",
    role: "코드 리뷰어",
    avatar: "💻",
    status: "working",
    current_task: "PR #482 보안 취약점 검토",
    tasks_completed: 642,
    success_rate: 94.8,
    last_active_at: minutesAgo(3),
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "데이지",
    role: "데이터 분석가",
    avatar: "📊",
    status: "idle",
    current_task: null,
    tasks_completed: 315,
    success_rate: 99.1,
    last_active_at: minutesAgo(18),
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    name: "마커스",
    role: "마케팅 카피라이터",
    avatar: "✍️",
    status: "error",
    current_task: "SNS API 인증 만료로 게시 실패",
    tasks_completed: 978,
    success_rate: 88.5,
    last_active_at: minutesAgo(7),
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    name: "헨리",
    role: "인사 담당 어시스턴트",
    avatar: "🗂️",
    status: "offline",
    current_task: null,
    tasks_completed: 203,
    success_rate: 96.4,
    last_active_at: minutesAgo(240),
  },
];
