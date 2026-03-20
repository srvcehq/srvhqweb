import { NextResponse } from "next/server";

export async function POST() {
  // Stub: In production, this would verify the Stripe webhook signature,
  // parse the event, and handle payment_intent.succeeded, etc.
  return NextResponse.json({ received: true });
}
