import { NextRequest } from "next/server";
import { verifyMagicLink } from "@/lib/magic-links";
import { setPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { relativeRedirect } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link login endpoint. Accepts a `client_login` token and exchanges it
 * for a session cookie, then redirects into the portal.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t");
  if (!token) return relativeRedirect("/portal?reason=no_token");

  const result = verifyMagicLink(token, "client_login");
  if (!result.valid) {
    const reason = result.reason === "expired" ? "expired" : "invalid";
    return relativeRedirect(`/portal?reason=${reason}`);
  }

  const { data: contact } = await getSupabaseAdmin()
    .from("contacts")
    .select("id")
    .eq("id", result.payload.sub)
    .maybeSingle();

  if (!contact) return relativeRedirect("/portal?reason=invalid");

  await setPortalSession(result.payload.sub, result.payload.meta);
  return relativeRedirect("/portal/dashboard");
}
