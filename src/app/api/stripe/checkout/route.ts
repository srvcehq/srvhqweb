import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculatePlatformFee, stripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const CHECKOUT_CAPACITY = 10;
const CHECKOUT_WINDOW_MS = 60_000;

const bodySchema = z.object({
  connectedAccountId: z.string().startsWith("acct_"),
  amountCents: z.number().int().positive().max(99_999_999),
  currency: z.string().length(3).default("usd"),
  description: z.string().min(1).max(500),
  customerEmail: z.string().email().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  successPath: z.string().startsWith("/").default("/payments?status=success"),
  cancelPath: z.string().startsWith("/").default("/payments?status=cancelled"),
});

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`checkout:${getClientIp(request)}`, CHECKOUT_CAPACITY, CHECKOUT_WINDOW_MS);
  if (!limit.ok) return rateLimitResponse(limit);

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: err instanceof z.ZodError ? err.issues : undefined },
      { status: 400 }
    );
  }

  try {
    const platformFee = calculatePlatformFee(parsed.amountCents);

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: parsed.currency,
            unit_amount: parsed.amountCents,
            product_data: { name: parsed.description },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee > 0 ? platformFee : undefined,
        transfer_data: { destination: parsed.connectedAccountId },
        metadata: parsed.metadata,
      },
      customer_email: parsed.customerEmail,
      metadata: parsed.metadata,
      success_url: `${publicEnv.NEXT_PUBLIC_APP_URL}${parsed.successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${publicEnv.NEXT_PUBLIC_APP_URL}${parsed.cancelPath}`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[stripe/checkout] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create checkout session", message }, { status: 500 });
  }
}
