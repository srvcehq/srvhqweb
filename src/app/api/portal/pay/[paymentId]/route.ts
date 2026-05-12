import { NextRequest, NextResponse } from "next/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import { getPortalSession } from "@/lib/portal-session";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { relativeRedirect } from "@/lib/http";

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
    return relativeRedirect("/portal");
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
      "id, contact_id, company_id, amount, status, description, type, stripe_payment_intent_id"
    )
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentErr || !paymentRow) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const payment = paymentRow as {
    id: string;
    contact_id: string;
    company_id: string;
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

  // Resolve the contractor's connected Stripe account (scoped to the payment's
  // company) + the contact's saved-customer ID (so we can reuse cards next time).
  const [{ data: settingsRow }, { data: contactRow }] = await Promise.all([
    supabase
      .from("company_settings")
      .select("stripe_connect_account_id, stripe_connect_status")
      .eq("id", payment.company_id)
      .maybeSingle(),
    supabase
      .from("contacts")
      .select("first_name, last_name, email, phone, stripe_customer_id")
      .eq("id", session.contactId)
      .maybeSingle(),
  ]);

  const settings = settingsRow as {
    stripe_connect_account_id: string | null;
    stripe_connect_status: string | null;
  } | null;
  const contact = contactRow as {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    stripe_customer_id: string | null;
  } | null;

  const connectedAccountId = settings?.stripe_connect_account_id ?? null;
  const stripeReady =
    settings?.stripe_connect_status === "active" && Boolean(connectedAccountId);

  if (!stripeReady || !connectedAccountId) {
    return NextResponse.json(
      { error: "Payments are not currently available. Please contact support." },
      { status: 503 }
    );
  }

  // Look up or create a platform Customer for this contact. Destination
  // charges run on the platform, so the customer + saved cards live here.
  // Schema migration 006 may not be applied yet — fall back to stateless
  // checkout (no card saving) if the column is missing or the read errors.
  let customerId: string | null = contact?.stripe_customer_id ?? null;
  if (!customerId) {
    try {
      const fullName = [contact?.first_name, contact?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const customer = await stripe().customers.create({
        email: contact?.email ?? undefined,
        name: fullName || undefined,
        phone: contact?.phone ?? undefined,
        metadata: { contact_id: session.contactId },
      });
      customerId = customer.id;
      const { error: updateErr } = await supabase
        .from("contacts")
        .update({ stripe_customer_id: customerId } as never)
        .eq("id", session.contactId);
      if (updateErr) {
        // 42703 = column doesn't exist (migration 006 not yet applied). Don't
        // block the payment; just lose the card-on-file feature for now.
        if (
          updateErr.code !== "42703" &&
          !/column .* does not exist/i.test(updateErr.message ?? "")
        ) {
          console.error("[portal/pay] failed to persist customer id:", updateErr.message);
        }
      }
    } catch (err) {
      console.error("[portal/pay] customer create failed, falling back:", err);
      customerId = null;
    }
  }

  const amountCents = Math.round(Number(payment.amount ?? 0) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
  }

  const platformFee = calculatePlatformFee(amountCents);
  const description = payment.description?.trim() || "SRVCE HQ service";

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
        // setup_future_usage: "off_session" tells Stripe to save the payment
        // method to the attached Customer after a successful charge. On the
        // next checkout for the same `customer`, Stripe shows a one-click
        // "Pay with saved card" option.
        setup_future_usage: customerId ? "off_session" : undefined,
        metadata: {
          payment_id: payment.id,
          contact_id: session.contactId,
          source: "portal",
        },
      },
      // customer + customer_email are mutually exclusive — Stripe pulls the
      // email from the Customer record when `customer` is set.
      ...(customerId
        ? { customer: customerId }
        : { customer_email: contact?.email ?? undefined }),
      saved_payment_method_options: customerId
        ? { payment_method_save: "enabled" }
        : undefined,
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
