/**
 * Mint a signed client-portal URL for a contact.
 *
 *   GET /api/portal/link?contactId=<uuid>&type=invite|login
 *
 * Returns `{ url }` — a magic-link URL pointing at `/portal/welcome?t=…`
 * (type=invite, 14-day token) or `/portal/auth?t=…` (type=login, 7-day token).
 *
 * Gated: the caller must have a valid contractor Supabase session, so only a
 * signed-in contractor can generate a portal link for one of their contacts.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildClientInviteUrl, buildClientLoginUrl } from "@/lib/magic-links";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(`portal-link:${getClientIp(request)}`, 30, 60_000);
  if (!limit.ok) return rateLimitResponse(limit);

  // Require a signed-in contractor.
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const contactId = url.searchParams.get("contactId");
  const type = url.searchParams.get("type") === "invite" ? "invite" : "login";
  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  const { data: contact, error } = await getSupabaseAdmin()
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const link =
    type === "invite" ? buildClientInviteUrl(contactId) : buildClientLoginUrl(contactId);
  return NextResponse.json({ url: link });
}
