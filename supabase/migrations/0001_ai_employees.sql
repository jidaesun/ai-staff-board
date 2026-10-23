-- AI 직원 현황판 테이블
create table if not exists public.ai_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  avatar text not null default '🤖',
  status text not null default 'idle'
    check (status in ('working', 'idle', 'offline', 'error')),
  current_task text,
  tasks_completed integer not null default 0 check (tasks_completed >= 0),
  success_rate numeric(5, 2) not null default 100
    check (success_rate between 0 and 100),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 현황판은 읽기 전용으로 공개 (쓰기는 service_role 로만)
alter table public.ai_employees enable row level security;

drop policy if exists "ai_employees are viewable by everyone" on public.ai_employees;
create policy "ai_employees are viewable by everyone"
  on public.ai_employees for select
  using (true);

-- 실시간 업데이트 구독 허용
alter publication supabase_realtime add table public.ai_employees;

-- 샘플 직원 5명
insert into public.ai_employees
  (id, name, role, avatar, status, current_task, tasks_completed, success_rate, last_active_at, created_at)
values
  ('00000000-0000-0000-0000-000000000001', '아리아', '고객 지원 상담원', '🎧', 'working', '환불 문의 티켓 12건 응대 중', 1284, 97.2, now() - interval '1 minute', now()),
  ('00000000-0000-0000-0000-000000000002', '코디', '코드 리뷰어', '💻', 'working', 'PR #482 보안 취약점 검토', 642, 94.8, now() - interval '3 minutes', now() + interval '1 second'),
  ('00000000-0000-0000-0000-000000000003', '데이지', '데이터 분석가', '📊', 'idle', null, 315, 99.1, now() - interval '18 minutes', now() + interval '2 seconds'),
  ('00000000-0000-0000-0000-000000000004', '마커스', '마케팅 카피라이터', '✍️', 'error', 'SNS API 인증 만료로 게시 실패', 978, 88.5, now() - interval '7 minutes', now() + interval '3 seconds'),
  ('00000000-0000-0000-0000-000000000005', '헨리', '인사 담당 어시스턴트', '🗂️', 'offline', null, 203, 96.4, now() - interval '4 hours', now() + interval '4 seconds')
on conflict (id) do nothing;
