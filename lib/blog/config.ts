// 블로그 작성을 지원하는 직원 (agents.id). 화면과 서버가 함께 씁니다.
export const BLOG_AGENT_ID = "large";

export { MIN_BODY_CHARS, STORE_NAME } from "./rules";

export const INSTRUCTION_MIN = 5;
export const INSTRUCTION_MAX = 2000;

// API 오류 응답 형식. code 로 원인을 구분합니다.
export type ApiErrorCode =
  | "unauthorized"
  | "bad_request"
  | "unsupported_agent"
  | "config_missing_url"
  | "config_missing_key"
  | "config_wrong_key"
  | "config_old_sdk"
  | "supabase_error"
  | "agent_not_found";

export interface ApiError {
  code: ApiErrorCode;
  error: string;
  detail?: string;
}
