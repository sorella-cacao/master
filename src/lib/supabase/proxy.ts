import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/** Refreshes the Pod login cookie and sends signed-out visitors to the login page. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Nothing may run between creating the client and getClaims(), or sessions can drop.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && request.nextUrl.pathname !== "/pod/login") {
    const login = request.nextUrl.clone();
    login.pathname = "/pod/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  return response;
}
