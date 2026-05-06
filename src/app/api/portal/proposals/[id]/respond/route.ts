import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESPOND_CAPACITY = 10;
const RESPOND_WINDOW_MS = 60_000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.redirect(new URL("/portal", request.url), 303);
  }

  const limit = checkRateLimit(
    `portal-respond:${session.contactId}:${getClientIp(request)}`,
    RESPOND_CAPACITY,
    RESPOND_WINDOW_MS
  );
  if (!limit.ok) return rateLimitResponse(limit);

  const { id } = await params;
  const form = await request.formData();
  const action = form.get("action");

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: bidRow } = await supabase
    .from("bids")
    .select("id, contact_id, status")
    .eq("id", id)
    .maybeSingle();

  const bid = bidRow as
    | { id: string; contact_id: string; status: string }
    | null;

  if (!bid) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (bid.contact_id !== session.contactId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (bid.status !== "sent") {
    return NextResponse.json(
      { error: `Proposal is ${bid.status} and cannot be changed` },
      { status: 409 }
    );
  }

  const newStatus = action === "accept" ? "accepted" : "declined";
  const patch =
    action === "accept"
      ? { status: newStatus, accepted_at: new Date().toISOString() }
      : { status: newStatus };

  const { error } = await supabase
    .from("bids")
    .update(patch as never)
    .eq("id", bid.id);

  if (error) {
    console.error("[portal/proposals/respond] update error", error);
    return NextResponse.json(
      { error: "Failed to record response" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(
    new URL(`/portal/proposals/${bid.id}?responded=${action}`, request.url),
    303
  );
}
