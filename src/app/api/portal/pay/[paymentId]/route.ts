import { NextRequest, NextResponse } from "next/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { getPortalSession } from "@/lib/portal-session";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAY_CAPACITY = 10;
const PAY_WINDOW_MS = 60_000;

const PAYABLE_STATUSES = new Set(["unpaid", "failed"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.redirect(new URL("/portal", request.url), 303);
  }

  const limit = checkRateLimit(
    `portal-pay:${session.contactId}:${getClientIp(request)}`,
    PAY_CAPACITY,
    PAY_WINDOW_MS
  );
  if (!limit.ok) return rateLimitResponse(limit);

  const { paymentId } = await params;

  const supabase = getSupabaseAdmin();

  const { data: paymentRow, error: paymentErr } = await supabase
    .from("payments")
    .select(
      "id, contact_id, amount, status, description, type, stripe_payment_intent_id"
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentErr || !paymentRow) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const payment = paymentRow as {
    id: string;
    contact_id: string;
    amount: number | string;
    status: string;
    description: string | null;
    type: string;
    stripe_payment_intent_id: string | null;
  };

  // CRITICAL: enforce contact ownership. The portal session is the only
  // authority for which payments this user can act on.
  if (payment.contact_id !== session.contactId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!PAYABLE_STATUSES.has(payment.status)) {
    return NextResponse.json(
      { error: `Payment is ${payment.status} and cannot be paid` },
      { status: 409 }
    );
  }

  // Resolve the contractor's connected Stripe account + customer email.
  const [{ data: settingsRow }, { data: contactRow }] = await Promise.all([
    supabase
      .from("company_settings")
      .select("stripe_connect_account_id, stripe_connect_status")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("contacts")
      .select("email")
      .eq("id", session.contactId)
      .maybeSingle(),
  ]);

  const settings = settingsRow as {
    stripe_connect_account_id: string | null;
    stripe_connect_status: string | null;
  } | null;
  const contact = contactRow as { email: string | null } | null;

  const connectedAccountId = settings?.stripe_connect_account_id ?? null;
  const stripeReady =
    settings?.stripe_connect_status === "active" && Boolean(connectedAccountId);

  if (!stripeReady || !connectedAccountId) {
    return NextResponse.json(
      { error: "Payments are not currently available. Please contact support." },
      { status: 503 }
    );
  }

  const amountCents = Math.round(Number(payment.amount ?? 0) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  const platformFee = calculatePlatformFee(amountCents);
  const description = payment.description?.trim() || "TerraFlow service";

  try {
    const checkout = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: { name: description },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee > 0 ? platformFee : undefined,
        transfer_data: { destination: connectedAccountId },
        metadata: {
          payment_id: payment.id,
          contact_id: session.contactId,
          source: "portal",
        },
      },
      customer_email: contact?.email ?? undefined,
      metadata: {
        payment_id: payment.id,
        contact_id: session.contactId,
        source: "portal",
      },
      success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/portal/payments?status=success&pid=${payment.id}`,
      cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/portal/payments?status=cancelled&pid=${payment.id}`,
    });

    if (!checkout.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return NextResponse.redirect(checkout.url, 303);
  } catch (err) {
    console.error("[portal/pay] checkout error", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
