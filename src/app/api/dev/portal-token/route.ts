/**
 * Dev-only — mint a portal session for the first/given contact.
 *
 *   curl http://localhost:3000/api/dev/portal-token
 *   curl http://localhost:3000/api/dev/portal-token?email=sarah@example.com
 *
 * Returns the welcome URL + the cookie value so you can hit the portal in a
 * browser. Disabled in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildClientInviteUrl } from "@/lib/magic-links";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (process.env.NODE_ENV === "production") {
  console.warn(
    "[portal-token] /api/dev/portal-token is mounted in production — disable before launch"
  );
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const id = url.searchParams.get("id");
  const list = url.searchParams.get("list");

  const supabase = getSupabaseAdmin();

  if (list) {
    const { data: rows } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .order("first_name", { ascending: true })
      .limit(20);
    return NextResponse.json({ contacts: rows ?? [] });
  }

  let q = supabase
    .from("contacts")
    .select("id, first_name, last_name, email")
    .limit(1);
  if (id) q = q.eq("id", id);
  else if (email) q = q.eq("email", email);

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const contact = (rows ?? [])[0] as
    | { id: string; first_name: string; last_name: string; email: string | null }
    | undefined;
  if (!contact) {
    return NextResponse.json({ error: "No contact found" }, { status: 404 });
  }

  const welcomeUrl = buildClientInviteUrl(contact.id);

  return NextResponse.json({
    contact: {
      id: contact.id,
      name: `${contact.first_name} ${contact.last_name}`,
      email: contact.email,
    },
    welcomeUrl,
  });
}
