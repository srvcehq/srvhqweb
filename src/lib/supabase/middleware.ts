import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

const BILLING_BYPASS_PREFIXES = ["/billing", "/onboarding"];

const ACTIVE_BILLING_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
]);

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

  // Subscription gate. /billing and /onboarding bypass this; everywhere else
  // requires an active subscription. Reads via the user-scoped supabase client
  // (RLS allows authenticated reads on company_settings).
  const path = request.nextUrl.pathname;
  const bypass = BILLING_BYPASS_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/")
  );

  if (!bypass) {
    // Read subscription_status. We must distinguish three cases:
    //   1. Column doesn't exist (migration 005 not applied) → fail OPEN.
    //   2. Column exists, value is non-active (incl. null) → BLOCK.
    //   3. Column exists, value is active/trialing/past_due → ALLOW.
    let columnExists = true;
    let status: string | null = null;
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("subscription_status")
        .maybeSingle();
      if (error) {
        if (
          error.code === "42703" ||
          /column .* does not exist/i.test(error.message ?? "")
        ) {
          columnExists = false;
        } else {
          console.error("[middleware/billing] read error:", error.message);
          // On unknown errors fail open — better than a redirect loop.
          columnExists = false;
        }
      } else {
        const row = data as { subscription_status?: string | null } | null;
        status = row?.subscription_status ?? null;
      }
    } catch (err) {
      console.error("[middleware/billing] read threw:", err);
      columnExists = false;
    }

    if (columnExists && (status === null || !ACTIVE_BILLING_STATUSES.has(status))) {
      const lockUrl = request.nextUrl.clone();
      lockUrl.pathname = "/billing/locked";
      lockUrl.search = "";
      return NextResponse.redirect(lockUrl);
    }
  }

  return response;
}
