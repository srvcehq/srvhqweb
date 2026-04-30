"use client";

export interface CreateCheckoutOpts {
  connectedAccountId: string;
  amountCents: number;
  description: string;
  paymentId: string;
  customerEmail?: string;
  contactId?: string;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export class StripeNotConnectedError extends Error {
  constructor() {
    super("Stripe is not connected. Connect your Stripe account in Settings before sending pay links.");
    this.name = "StripeNotConnectedError";
  }
}

export async function createCheckoutSession(opts: CreateCheckoutOpts): Promise<CheckoutResult> {
  if (!opts.connectedAccountId) throw new StripeNotConnectedError();

  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connectedAccountId: opts.connectedAccountId,
      amountCents: opts.amountCents,
      currency: "usd",
      description: opts.description,
      customerEmail: opts.customerEmail,
      metadata: {
        payment_id: opts.paymentId,
        ...(opts.contactId ? { contact_id: opts.contactId } : {}),
      },
    }),
  });

  if (response.status === 429) {
    throw new Error("Too many checkout requests. Please wait a moment and try again.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || "Failed to create checkout session.");
  }
  if (!data.url) throw new Error("Stripe did not return a checkout URL.");

  return { url: data.url, sessionId: data.sessionId };
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}
