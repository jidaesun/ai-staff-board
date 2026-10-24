import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

const LOGIN_PATH = "/login";

// 요청마다 세션을 갱신하고, 로그인하지 않은 사용자는 로그인 화면으로 보냅니다.
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === LOGIN_PATH;
  // API 라우트는 리다이렉트하지 않고 각 라우트가 401 을 돌려줌
  const isApi = pathname.startsWith("/api/");

  const redirectTo = (path: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = next ? `?next=${encodeURIComponent(next)}` : "";
    return url;
  };

  if (!isSupabaseConfigured) {
    return isLoginPage || isApi ? NextResponse.next() : NextResponse.redirect(redirectTo(LOGIN_PATH));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLoginPage && !isApi) {
    return withCookies(NextResponse.redirect(redirectTo(LOGIN_PATH, pathname + search)), response);
  }
  if (user && isLoginPage) {
    return withCookies(NextResponse.redirect(redirectTo("/")), response);
  }
  return response;
}

// 갱신된 세션 쿠키를 리다이렉트 응답에도 실어 보냄
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}
