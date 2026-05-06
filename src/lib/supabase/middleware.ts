import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Refresh the Supabase session cookie on every contractor-app request, and
 * gate access. Pages we want public (`/login`, `/signup`, `/portal/*`,
 * `/onboarding/*`, API routes, static assets) are excluded via the matcher
 * in `src/middleware.ts` — this helper assumes anything that reaches it
 * needs a session.
 *
 * Returns the response to send. If the user has no session, returns a 307
 * redirect to /login carrying a `?next=` so we can bounce them back after
 * sign-in.
 */
export async function authGate(request: NextRequest) {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Misconfigured — fail open to /login rather than crash the whole app.
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() validates the JWT against Supabase. Don't use
  // getSession() in middleware — it trusts the cookie blindly.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const target =
      request.nextUrl.pathname + (request.nextUrl.search ?? "");
    if (target && target !== "/" && target !== "/login") {
      loginUrl.searchParams.set("next", target);
    }
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
