import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

let client: SupabaseClient | null = null;

// 브라우저용 (Realtime 구독). 로그인 세션 쿠키를 공유합니다.
export function getBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  return client;
}
