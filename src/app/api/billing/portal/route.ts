import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBilling } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session and 303s to it. Customers manage
 * the subscription (upgrade/downgrade/cancel/update card) entirely on Stripe's
 * hosted UI; we get the state changes back via webhook.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const billing = await getBilling();
  if (!billing?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No subscription on file — start one with /api/billing/checkout" },
      { status: 400 }
    );
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return NextResponse.redirect(session.url, 303);
}
