import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getServerEnv } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { patchBillingByCustomerId, type StripeSubscriptionStatus } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPANY_NAME_FALLBACK = "SRVCE HQ";

type PaymentStatus =
  | "unpaid"
  | "processing"
  | "succeeded"
  | "failed"
  | "partially_refunded"
  | "refunded";

async function patchPaymentById(
  paymentId: string,
  patch: { status?: PaymentStatus; stripe_payment_intent_id?: string; paid_date?: string },
) {
  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update(patch as never)
    .eq("id", paymentId);
  if (error) {
    console.error(`[stripe/webhook] failed to patch payment ${paymentId}:`, error.message);
  }
}

async function patchPaymentByIntent(
  paymentIntentId: string,
  patch: { status?: PaymentStatus; paid_date?: string },
) {
  const { error } = await getSupabaseAdmin()
    .from("payments")
    .update(patch as never)
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (error) {
    console.error(
      `[stripe/webhook] failed to patch payment by intent ${paymentIntentId}:`,
      error.message,
    );
  }
}

function fmtMoney(amountCents: number | null | undefined): string {
  const n = (amountCents ?? 0) / 100;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

async function notifyPaymentFailed(opts: {
  email?: string | null;
  phone?: string | null;
  amountCents: number | null | undefined;
  errorMessage?: string;
  retryUrl?: string;
}) {
  const amt = fmtMoney(opts.amountCents);
  const company = COMPANY_NAME_FALLBACK;
  const retry = opts.retryUrl ? `\n\nRetry: ${opts.retryUrl}` : "";

  if (opts.email) {
    await sendEmail({
      to: opts.email,
      subject: "Payment Could Not Be Processed",
      textBody: `Hi there,\n\nWe weren't able to process your payment of ${amt}. ${
        opts.errorMessage ? `Reason: ${opts.errorMessage}.` : "This usually means the card was declined or has expired."
      }${retry}\n\nIf you continue to have trouble, please reply to this email.\n\nThanks,\n${company}`,
      tag: "payment_failed",
    });
  }
  if (opts.phone) {
    await sendSms({
      to: opts.phone,
      body: `${company}: Your payment of ${amt} could not be processed.${retry ? ` Retry: ${opts.retryUrl}` : ""}`,
    });
  }
}

async function notifyChargeRefunded(opts: {
  email?: string | null;
  phone?: string | null;
  amountRefundedCents: number;
}) {
  const amt = fmtMoney(opts.amountRefundedCents);
  const company = COMPANY_NAME_FALLBACK;

  if (opts.email) {
    await sendEmail({
      to: opts.email,
      subject: "Refund Issued",
      textBody: `Hi there,\n\nA refund of ${amt} has been issued to your original payment method.\n\nDepending on your bank, this may take 5-10 business days to appear on your statement.\n\nIf you have questions, please reply to this email.\n\nThanks,\n${company}`,
      tag: "charge_refunded",
    });
  }
  if (opts.phone) {
    await sendSms({
      to: opts.phone,
      body: `${company}: A refund of ${amt} has been issued. It may take 5-10 business days to appear.`,
    });
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();

  // Two webhook endpoints land here: the platform endpoint (subscriptions,
  // platform-level events) and the Connect endpoint (events from connected
  // accounts, e.g. client portal payments). Each has its own signing secret.
  // Try both; whichever verifies wins.
  const env = getServerEnv();
  const secrets = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => Boolean(s)
  );
  if (secrets.length === 0) {
    console.error(
      "[stripe/webhook] no webhook secrets configured — set STRIPE_WEBHOOK_SECRET and/or STRIPE_CONNECT_WEBHOOK_SECRET"
    );
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event | null = null;
  let lastError: unknown = null;
  for (const secret of secrets) {
    try {
      event = stripe().webhooks.constructEvent(rawBody, signature, secret);
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!event) {
    const message = lastError instanceof Error ? lastError.message : "Invalid signature";
    console.error("[stripe/webhook] signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        console.log("[stripe/webhook] checkout completed", {
          id: session.id,
          amount_total: session.amount_total,
          payment_intent: paymentIntentId,
          payment_id: paymentId,
        });
        if (paymentId) {
          await patchPaymentById(paymentId, {
            status: "succeeded",
            paid_date: new Date().toISOString(),
            ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
          });
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const paymentId = pi.metadata?.payment_id;
        console.log("[stripe/webhook] payment succeeded", { id: pi.id, amount: pi.amount });
        // Idempotent backstop in case checkout.session.completed didn't fire
        // (e.g. PaymentIntent created outside of Checkout).
        if (paymentId) {
          await patchPaymentById(paymentId, {
            status: "succeeded",
            paid_date: new Date().toISOString(),
            stripe_payment_intent_id: pi.id,
          });
        } else {
          await patchPaymentByIntent(pi.id, {
            status: "succeeded",
            paid_date: new Date().toISOString(),
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const paymentId = pi.metadata?.payment_id;
        console.warn("[stripe/webhook] payment failed", {
          id: pi.id,
          error: pi.last_payment_error?.message,
        });
        if (paymentId) {
          await patchPaymentById(paymentId, {
            status: "failed",
            stripe_payment_intent_id: pi.id,
          });
        } else {
          await patchPaymentByIntent(pi.id, { status: "failed" });
        }
        await notifyPaymentFailed({
          email: pi.receipt_email,
          phone: null,
          amountCents: pi.amount,
          errorMessage: pi.last_payment_error?.message,
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const item = sub.items?.data?.[0];
        const priceId = item?.price?.id ?? null;
        const periodEndUnix = item?.current_period_end ?? null;
        const periodEnd =
          typeof periodEndUnix === "number"
            ? new Date(periodEndUnix * 1000).toISOString()
            : null;
        const trialEnd =
          typeof sub.trial_end === "number"
            ? new Date(sub.trial_end * 1000).toISOString()
            : null;
        console.log(`[stripe/webhook] ${event.type}`, {
          id: sub.id,
          customer: customerId,
          status: sub.status,
          price: priceId,
        });
        await patchBillingByCustomerId(customerId, {
          stripe_subscription_id: sub.id,
          subscription_status: sub.status as StripeSubscriptionStatus,
          subscription_price_id: priceId,
          subscription_current_period_end: periodEnd,
          trial_ends_at: trialEnd,
        });
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log("[stripe/webhook] connect account updated", {
          id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
        });
        const status = account.charges_enabled && account.payouts_enabled
          ? "active"
          : account.details_submitted
            ? "pending_review"
            : "pending";
        const { error } = await getSupabaseAdmin()
          .from("company_settings")
          .update({ stripe_connect_status: status } as never)
          .eq("stripe_connect_account_id", account.id);
        if (error) {
          console.error(
            `[stripe/webhook] failed to update connect status for ${account.id}:`,
            error.message,
          );
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        const fullyRefunded = charge.amount_refunded >= charge.amount;
        console.log("[stripe/webhook] refunded", {
          id: charge.id,
          amount_refunded: charge.amount_refunded,
          fully_refunded: fullyRefunded,
        });
        if (paymentIntentId) {
          await patchPaymentByIntent(paymentIntentId, {
            status: fullyRefunded ? "refunded" : "partially_refunded",
          });
        }
        await notifyChargeRefunded({
          email: charge.billing_details?.email,
          phone: charge.billing_details?.phone,
          amountRefundedCents: charge.amount_refunded,
        });
        break;
      }
      default:
        // Acknowledge unhandled event types — Stripe expects 2xx within 30s
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
