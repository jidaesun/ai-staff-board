# AI 직원 현황판

Next.js(App Router)와 Supabase로 만든 AI 직원 작업 현황판입니다.

- AI 직원 카드: `agents` 테이블의 직원(대형가전 AI, 생활가전 AI, 주방가전 AI, PC AI, 모바일 AI)을 `sort` 순으로 표시
- 상단 집계: 전체, 작업 중, 완료, 대기 중, 오류
- 카드를 누르면 상세 화면(`/agents/[agents.id]`)에서 작업 목록, 단계 목록, 결과물을 볼 수 있음
- Supabase Auth 이메일·비밀번호 로그인. 로그인하지 않으면 로그인 화면만 보임 (회원가입 화면 없음)
- 반응형 레이아웃(폰, 태블릿, PC), 라이트/다크/시스템 테마
- Supabase Realtime: 테이블이 바뀌면 화면을 자동으로 다시 불러옴

## 시작하기

```bash
cp .env.example .env.local   # Supabase URL, anon key 입력
npm install
npm run dev
```

## 로그인

- 회원가입 화면은 없습니다. 사용자는 Supabase 대시보드의 **Authentication > Users > Add user**에서 만드세요.
- 로그인하지 않은 상태로 현황판이나 상세 화면에 들어가면 `/login`으로 이동하고, 로그인 후 원래 보던 화면으로 돌아갑니다.
- 로그인 세션은 쿠키에 저장되고 `proxy.ts`가 요청마다 갱신합니다.
- 데이터는 로그인한 사용자 권한(`authenticated` 역할)으로 조회합니다.

## 사용하는 Supabase 테이블

이 앱은 테이블을 만들지 않고, 이미 있는 테이블을 읽기만 합니다.

| 테이블 | 사용하는 컬럼 | 쓰임 |
| --- | --- | --- |
| `agents` | `id`, `name`, `specialty`, `sort` | 카드 순서는 `sort`, 상세 URL은 `id` |
| `tasks` | 전체 컬럼 | 제목은 `topic`, 없으면 `instruction`. `created_at` 최신순 |
| `task_steps` | `label`, `status`, `summary`, `position`, `started_at`, `finished_at` | `position` 순 |
| `outputs` | `kind`, `format`, `content`, `file_path`, `version`, `created_at` | 최종 결과물 수는 `kind='final'`만 |

- 로그인한 사용자 권한으로 읽으므로 각 테이블에 `authenticated` 역할의 `select` RLS 정책이 필요합니다. 예:
  ```sql
  create policy "authenticated read" on public.tasks for select to authenticated using (true);
  ```
- 자동 갱신을 원하면 테이블을 `supabase_realtime` publication에 추가하세요.
- 조회에 실패하면 화면 상단에 오류 메시지를 표시합니다.

## 카드에 표시하는 값

- `agents.name`, `agents.specialty`
- 가장 최근 작업의 `status`, 제목, `current_step`, `started_at`, `error_message` 유무
- 최종 결과물 수: 그 직원의 모든 작업에서 `outputs.kind='final'`인 행 수
- 전체 작업 수

## 상태 값

`tasks.status`, `task_steps.status`는 DB 값을 그대로 표시합니다. 값에 따라 색상과 집계만 달라집니다.

| 집계 | `tasks.status` |
| --- | --- |
| 전체 | `agents`에 있는 직원의 모든 작업 |
| 작업 중 | `analyzing`, `topic`, `research`, `writing`, `pop`, `review` |
| 완료 | `done` |
| 대기 중 | `queued` |
| 오류 | `error` |

`canceled`는 전체에만 포함됩니다.

## 구조

```
proxy.ts                 # 세션 갱신, 미로그인 시 /login 으로 이동
app/
  login/                 # 로그인 화면
  page.tsx               # 현황판
  agents/[id]/page.tsx   # 직원 상세 (작업, 단계, 결과물)
components/              # 헤더(로그아웃), 카드, 집계, 상태 배지, Realtime, 테마
lib/
  auth.ts                # 로그인 확인
  auth-actions.ts        # 로그인, 로그아웃 서버 액션
  data.ts                # Supabase 조회
  status.ts              # 상태 분류, 색상
  types.ts               # 테이블 행 타입
  supabase/              # 서버, 브라우저, proxy 용 Supabase 클라이언트
```
