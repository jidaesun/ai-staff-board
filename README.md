# AI 직원 현황판

Next.js(App Router)와 Supabase로 만든 AI 직원 작업 현황판입니다.

- AI 직원 카드: `agents` 테이블의 직원(대형가전 AI, 생활가전 AI, 주방가전 AI, PC AI, 모바일 AI)을 `sort` 순으로 표시
- 상단 집계: 전체, 작업 중, 완료, 대기 중, 오류
- 카드를 누르면 상세 화면(`/agents/[agents.id]`)에서 작업 목록, 단계 목록, 결과물을 볼 수 있음
- Supabase Auth 이메일·비밀번호 로그인. 로그인하지 않으면 로그인 화면만 보임 (회원가입 화면 없음)
- 반응형 레이아웃(폰, 태블릿, PC), 라이트/다크/시스템 테마
- Supabase Realtime: 테이블이 바뀌면 화면을 자동으로 다시 불러옴
- 업무 지시 입력창: 대형가전 AI에게 블로그 작성을 지시하면 5단계로 실행하고, 완성된 글은 복사 버튼으로 복사

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

## 환경 변수

| 이름 | 쓰는 곳 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 화면, 서버 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 화면(로그인, 읽기) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 API 라우트에서만 (DB 쓰기). 브라우저로 보내지 않음. secret 키(`sb_secret_…`) 또는 기존 `service_role` JWT |
| `ANTHROPIC_API_KEY` | 서버 API 라우트에서만 (Claude 호출) |

### 서버 설정 점검

업무 지시 입력창의 **서버 설정 점검**(또는 로그인 상태에서 `GET /api/health`)으로 아래를 확인합니다. 키 값은 출력하지 않고 종류만 보여 줍니다.

- `SUPABASE_SERVICE_ROLE_KEY`: 없음, 빈 값, `sb_secret_`(정상), `service_role` JWT(정상), `sb_publishable_`·`anon` JWT(잘못 넣은 키), 앞뒤 공백·따옴표 제거 여부
- `@supabase/supabase-js` 버전과 `sb_secret_` 키 지원 여부 (2.118.0에서 확인)
- service role 키로 `agents.id='large'` 조회 결과: 찾음, 0행, Supabase 오류

업무 지시가 실패하면 원인을 구분해 보여 줍니다: 서버 설정 문제(키 없음, 잘못된 키 종류), Supabase 오류(Supabase가 돌려준 메시지), 행 없음(조회는 성공했지만 0행). 오류 메시지에 키 값이 섞여 있으면 가립니다.

## 블로그 작성 (대형가전 AI)

블로그 작성 직원은 `agents.id = 'large'` 행입니다 (`lib/blog/config.ts`의 `BLOG_AGENT_ID`). 현황판이나 이 직원의 상세 화면에 있는 업무 지시 입력창에 지시를 넣으면 작업이 만들어지고 아래 단계를 차례로 실행합니다.

| 순서 | `task_steps.step_key` | `label` | 실행 중 `tasks.status` | 하는 일 |
| --- | --- | --- | --- | --- |
| 1 | `analyze` | 업무 분석 | `analyzing` | 지시를 분석 (대상 제품, 독자, 목적, 키워드) |
| 2 | `topic` | 주제 선정 | `topic` | 제목 한 줄을 정해 `tasks.topic`에 저장 |
| 3 | `research` | 자료 조사 | `research` | Claude 웹 검색으로 자료 조사, 출처 URL 포함 |
| 4 | `write` | 콘텐츠 작성 | `writing` | 초안 작성 → `outputs` (`intermediate`, `blog`, v1) |
| 5 | `review` | 결과물 검토 | `review` | 규칙 검증. 통과하면 `outputs` (`final`) 저장 후 `done` |

- **실제 실행 시점 기록:** 단계 행은 그 단계가 시작될 때 `running`으로 추가되고, 끝나면 `done`과 `finished_at`, `summary`가 기록됩니다. 미리 만들어 두거나 가짜 진행률을 쓰지 않습니다.
- **단계별 서버 호출:** 화면이 `POST /api/tasks/[id]/advance`를 반복 호출하고, 한 번 호출에 한 단계(Claude 호출 최대 1회)만 실행합니다. 화면을 닫으면 진행 중인 단계가 끝난 뒤 멈추고, 상세 화면의 **이어서 실행**으로 계속할 수 있습니다. 같은 작업을 두 곳에서 실행해도 한 단계는 한 번만 실행됩니다.
- **블로그 규칙 (코드로 검증, `lib/blog/rules.ts`):**
  - 매장명은 `율량하이마트`로 통일 (`롯데하이마트`, `하이마트 율량점`, `율량 하이마트` 등은 위반)
  - 본문(제목 줄, 해시태그 줄 제외)이 공백 제외 1,500자 초과
  - 해시태그는 마지막 한 줄에만
- **재작성:** 검토에서 규칙을 어기면 위반 내용을 알려 주고 한 번 다시 쓰게 합니다. 위반 내용과 재검증 결과는 `결과물 검토` 단계의 `summary`에, 초안은 `outputs`에 v1, v2로 남습니다. 재작성도 어기면 작업은 `error`가 됩니다.
- **오류:** 해당 작업의 `tasks.error_message`와 실패한 단계에만 기록됩니다.
- **쓰기 권한:** DB 쓰기는 API 라우트에서 service role 키로만 합니다. 화면(브라우저)은 읽기만 합니다.
- 모델은 `claude-opus-5-5`이고, 안전 분류기가 거절하면 서버가 다른 모델로 다시 시도하는 `fallbacks: "default"`를 켰습니다.
- `tasks`, `task_steps`, `outputs`의 `id`는 DB 기본값으로 만들어진다고 가정합니다.

규칙 검증 테스트: `npm test`

## 사용하는 Supabase 테이블

화면은 테이블을 읽기만 하고, 쓰기는 위의 블로그 작성 API 라우트에서만 합니다.

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
  api/tasks/             # 업무 지시 등록, 단계 실행 API (DB 쓰기)
  page.tsx               # 현황판
  agents/[id]/page.tsx   # 직원 상세 (작업, 단계, 결과물)
components/              # 헤더(로그아웃), 카드, 집계, 상태 배지, Realtime, 테마
lib/
  auth.ts                # 로그인 확인
  auth-actions.ts        # 로그인, 로그아웃 서버 액션
  blog/                  # 블로그 단계 실행, 프롬프트, 규칙 검증
  data.ts                # Supabase 조회
  status.ts              # 상태 분류, 색상
  types.ts               # 테이블 행 타입
  supabase/              # 서버, 브라우저, proxy, service role 용 Supabase 클라이언트
```
