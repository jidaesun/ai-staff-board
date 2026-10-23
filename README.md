# AI 직원 현황판

Next.js(App Router)와 Supabase로 만든 AI 직원 상태 대시보드입니다.

- AI 직원 5명의 카드: 상태, 현재 작업, 완료 작업 수, 성공률, 마지막 활동 시각
- 상태 요약: 업무 중, 대기, 오류, 오프라인 인원 수
- 반응형 레이아웃: 화면 너비에 따라 1열, 2열, 3열, 5열
- 다크 모드: 라이트, 다크, 시스템 중 선택하며 선택값은 저장됨 (`next-themes`)
- Supabase Realtime: 테이블이 바뀌면 새로고침 없이 카드에 반영됨

## 시작하기

```bash
npm install
npm run dev
```

http://localhost:3000 에 접속합니다. Supabase 환경 변수가 없으면 내장 샘플 데이터로 동작합니다.

## Supabase 연결

1. Supabase에서 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/migrations/0001_ai_employees.sql`을 실행합니다.
   - `ai_employees` 테이블 생성, 읽기 전용 RLS 정책, Realtime 등록, 샘플 직원 5명 시드
3. `.env.example`을 `.env.local`로 복사하고 값을 채웁니다.

```bash
cp .env.example .env.local
```

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon (public) key |

Supabase 대시보드에서 직원의 `status`를 `working`, `idle`, `offline`, `error` 중 하나로 바꾸거나 `current_task`를 수정하면 현황판에 바로 반영됩니다.

## 구조

```
app/
  layout.tsx          # ThemeProvider, 전역 스타일
  page.tsx            # 서버에서 직원 목록 조회
components/
  staff-board.tsx     # 상태 요약 + 카드 그리드 + Realtime 구독
  employee-card.tsx   # AI 직원 카드
  theme-toggle.tsx    # 라이트/다크/시스템 전환
lib/
  supabase.ts         # Supabase 클라이언트
  employees.ts        # 데이터 조회 (실패 시 샘플 데이터)
  mock-data.ts        # 샘플 직원 5명
  status.ts           # 상태별 라벨, 색상
supabase/migrations/  # 테이블 스키마 + 시드
```
