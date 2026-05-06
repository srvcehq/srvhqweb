import type { NextRequest } from "next/server";
import { authGate } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return authGate(request);
}

export const config = {
  // Run on everything EXCEPT:
  //  - /login, /signup (the auth pages themselves)
  //  - /portal/* (client portal — has its own session via tf_portal_session)
  //  - /api/* (API routes self-authorize)
  //  - _next, static assets, favicon
  // /onboarding IS gated (post-signup wizard, signed-in users only).
  // / IS gated (root redirect — must be signed in to land somewhere).
  matcher: [
    "/((?!login|signup|portal|api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
