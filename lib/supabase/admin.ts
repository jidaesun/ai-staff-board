import "server-only";
import supabasePkg from "@supabase/supabase-js/package.json";
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

export type ServiceKeyKind =
  | "missing"
  | "empty"
  | "secret" // sb_secret_…
  | "service_role_jwt" // 기존 service_role JWT
  | "publishable" // sb_publishable_… (잘못 넣은 경우)
  | "anon_jwt" // 기존 anon JWT (잘못 넣은 경우)
  | "other_jwt"
  | "unknown";

export interface ServiceKeyCheck {
  kind: ServiceKeyKind;
  ok: boolean;
  label: string;
  message: string | null;
  // 앞뒤 공백이나 따옴표가 붙어 있어 제거했는지
  cleaned: boolean;
}

const KEY_HELP = "Supabase 대시보드 > Project Settings > API Keys 의 secret 키(sb_secret_…) 또는 service_role 키를 넣으세요.";

// 키 값은 반환하지 않고 종류만 판별합니다.
export function inspectServiceRoleKey(): ServiceKeyCheck {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (raw === undefined) {
    return { kind: "missing", ok: false, label: "없음", cleaned: false, message: `SUPABASE_SERVICE_ROLE_KEY 환경 변수가 서버에 없습니다. ${KEY_HELP}` };
  }
  const key = cleanKey(raw);
  const cleaned = key !== raw;
  if (!key) {
    return { kind: "empty", ok: false, label: "빈 값", cleaned, message: `SUPABASE_SERVICE_ROLE_KEY 가 비어 있습니다. ${KEY_HELP}` };
  }
  if (key.startsWith("sb_secret_")) return { kind: "secret", ok: true, label: "secret 키 (sb_secret_)", cleaned, message: null };
  if (key.startsWith("sb_publishable_")) {
    return { kind: "publishable", ok: false, label: "publishable 키 (sb_publishable_)", cleaned, message: `SUPABASE_SERVICE_ROLE_KEY 에 publishable 키가 들어 있습니다. 이 키는 RLS를 통과하지 못해 조회 결과가 비어 보입니다. ${KEY_HELP}` };
  }
  const role = jwtRole(key);
  if (role === "service_role") return { kind: "service_role_jwt", ok: true, label: "service_role JWT", cleaned, message: null };
  if (role === "anon" || role === "authenticated") {
    return { kind: "anon_jwt", ok: false, label: `${role} JWT`, cleaned, message: `SUPABASE_SERVICE_ROLE_KEY 에 ${role} 키가 들어 있습니다. 이 키는 RLS를 통과하지 못해 조회 결과가 비어 보입니다. ${KEY_HELP}` };
  }
  if (role !== null) return { kind: "other_jwt", ok: false, label: `JWT (role: ${role})`, cleaned, message: `SUPABASE_SERVICE_ROLE_KEY 의 role 이 service_role 이 아닙니다. ${KEY_HELP}` };
  // 알 수 없는 형식은 서버가 판단하도록 그대로 사용
  return { kind: "unknown", ok: true, label: "알 수 없는 형식", cleaned, message: null };
}

function cleanKey(raw: string): string {
  return raw.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
}

// JWT payload 의 role 만 읽음 (서명 검증 아님)
function jwtRole(key: string): string | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : "(없음)";
  } catch {
    return null;
  }
}

export const supabaseJsVersion: string = supabasePkg.version;
// sb_publishable_ / sb_secret_ 키를 인식하는 것을 확인한 버전 (소스의 isNewApiKey)
const NEW_KEY_VERIFIED_VERSION = "2.118.0";
export const supportsNewApiKeys = compareVersions(supabaseJsVersion, NEW_KEY_VERIFIED_VERSION) >= 0;

function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map(Number);
  const pb = b.split(/[.-]/).map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export class AdminConfigError extends Error {
  constructor(
    readonly code: "config_missing_url" | "config_missing_key" | "config_wrong_key" | "config_old_sdk",
    message: string,
  ) {
    super(message);
  }
}

let client: SupabaseClient | null = null;

// DB 쓰기 전용. service role 키는 서버(API 라우트)에서만 사용하고 브라우저로 보내지 않습니다.
export function getAdminClient(): SupabaseClient {
  if (!supabaseUrl) throw new AdminConfigError("config_missing_url", "NEXT_PUBLIC_SUPABASE_URL 환경 변수가 없습니다.");
  const check = inspectServiceRoleKey();
  if (!check.ok) {
    const code = check.kind === "missing" || check.kind === "empty" ? "config_missing_key" : "config_wrong_key";
    throw new AdminConfigError(code, check.message ?? "SUPABASE_SERVICE_ROLE_KEY 를 확인하세요.");
  }
  if (check.kind === "secret" && !supportsNewApiKeys) {
    throw new AdminConfigError(
      "config_old_sdk",
      `설치된 @supabase/supabase-js ${supabaseJsVersion} 는 sb_secret_ 키 지원이 확인되지 않았습니다. ${NEW_KEY_VERIFIED_VERSION} 이상으로 올리세요.`,
    );
  }
  client ??= createClient(supabaseUrl, cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY!), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// 오류 메시지를 화면이나 DB에 남기기 전에 키 값이 섞여 있으면 가림
export function redactSecrets(text: string): string {
  const secrets = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY && cleanKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.ANTHROPIC_API_KEY,
  ].filter((s): s is string => typeof s === "string" && s.length >= 8);
  return secrets.reduce((acc, s) => acc.split(s).join("[키 숨김]"), text);
}

// Supabase 가 돌려준 오류 내용 (키 값은 가림)
export function describeSupabaseError(error: PostgrestError): string {
  const parts = [error.message, error.code && `code ${error.code}`, error.details, error.hint && `hint: ${error.hint}`];
  return redactSecrets(parts.filter(Boolean).join(" · "));
}

export function supabaseHost(): string | null {
  try {
    return supabaseUrl ? new URL(supabaseUrl).host : null;
  } catch {
    return null;
  }
}
