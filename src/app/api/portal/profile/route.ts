import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROFILE_CAPACITY = 10;
const PROFILE_WINDOW_MS = 60_000;

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .max(254)
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  address_line1: z.string().trim().max(255).optional().or(z.literal("")),
  address_line2: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(50).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
});

function emptyToNull<T extends string | undefined>(v: T): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function POST(request: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.redirect(new URL("/portal", request.url), 303);
  }

  const limit = checkRateLimit(
    `portal-profile:${session.contactId}:${getClientIp(request)}`,
    PROFILE_CAPACITY,
    PROFILE_WINDOW_MS
  );
  if (!limit.ok) return rateLimitResponse(limit);

  const form = await request.formData();
  const raw = Object.fromEntries(form.entries());

  let parsed;
  try {
    parsed = profileSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid profile data", details: err instanceof z.ZodError ? err.issues : undefined },
      { status: 400 }
    );
  }

  const patch = {
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    email: emptyToNull(parsed.email),
    phone: emptyToNull(parsed.phone),
    address_line1: emptyToNull(parsed.address_line1),
    address_line2: emptyToNull(parsed.address_line2),
    city: emptyToNull(parsed.city),
    state: emptyToNull(parsed.state),
    zip: emptyToNull(parsed.zip),
  };

  const { error } = await getSupabaseAdmin()
    .from("contacts")
    .update(patch as never)
    .eq("id", session.contactId);

  if (error) {
    console.error("[portal/profile] update error", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(
    new URL("/portal/profile?saved=1", request.url),
    303
  );
}
