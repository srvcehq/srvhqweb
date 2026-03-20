import { NextResponse } from "next/server";

export async function POST() {
  // Stub: In production, this would create a Stripe Connect account link
  // for onboarding the business to accept payments via Stripe Connect.
  return NextResponse.json({
    url: "https://connect.stripe.com/mock-account-link",
    accountId: "acct_mock_123",
  });
}
