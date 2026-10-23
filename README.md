# AI 직원 현황판

Next.js(App Router)와 Supabase로 만든 AI 직원 작업 현황판입니다.

- AI 직원 5명 고정: 대형가전 AI, 생활가전 AI, 주방가전 AI, PC AI, 모바일 AI
- 상단 집계: 전체, 작업 중, 완료, 대기 중, 오류
- 카드를 누르면 상세 화면(`/agents/[slug]`)에서 작업 목록, 단계 목록, 결과물을 볼 수 있음
- 반응형 레이아웃, 라이트/다크/시스템 테마
- Supabase Realtime: 테이블이 바뀌면 화면을 자동으로 다시 불러옴

## 시작하기

```bash
cp .env.example .env.local   # Supabase URL, anon key 입력
npm install
npm run dev
```

## 사용하는 Supabase 테이블

이 앱은 테이블을 만들지 않고, 이미 있는 테이블을 읽기만 합니다.

| 테이블 | 사용하는 컬럼 |
| --- | --- |
| `agents` | `id`, `name` (위 5개 이름과 정확히 같아야 매칭됨) |
| `tasks` | `id`, `agent_id`, `status`, `title`, `created_at`, `updated_at` |
| `task_steps` | `id`, `task_id`, `name`, `status`, `created_at` (생성 순으로 정렬) |
| `outputs` | `id`, `task_id`, `type`, `content`, `url`, `created_at` |

- anon key로 읽으므로 각 테이블에 `select` RLS 정책이 필요합니다.
- 자동 갱신을 원하면 테이블을 `supabase_realtime` publication에 추가하세요.
- 조회에 실패하면 화면 상단에 오류 메시지를 표시합니다.

## 상태 값

`tasks.status`는 DB 값을 그대로 표시합니다. 값에 따라 색상과 집계만 달라집니다.

| 집계 | 상태 값 |
| --- | --- |
| 전체 | 5명 직원의 모든 작업 |
| 작업 중 | `analyzing`, `topic`, `research`, `writing`, `pop`, `review` |
| 완료 | `done` |
| 대기 중 | `queued` |
| 오류 | `error` |

`canceled`는 전체에만 포함됩니다. 카드의 상태는 해당 직원의 가장 최근 작업(`created_at` 기준) 상태입니다.

## 구조

```
app/
  page.tsx               # 현황판
  agents/[slug]/page.tsx # 직원 상세 (작업, 단계, 결과물)
components/              # 카드, 집계, 상태 배지, Realtime, 테마
lib/
  agents.ts              # 고정 직원 5명
  data.ts                # Supabase 조회
  status.ts              # 상태 분류, 색상
  supabase.ts            # Supabase 클라이언트
```
