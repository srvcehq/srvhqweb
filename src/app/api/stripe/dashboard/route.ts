/**
 * POST /api/stripe/dashboard
 *
 * Returns `{ url }` — a single-use Stripe Express dashboard login link for the
 * signed-in contractor's connected account. The client navigates the browser
 * to it (don't fetch-follow it — login links are single-use). 400 if the
 * contractor hasn't connected a Stripe account yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCompanySettings, getCurrentCompanyId } from "@/lib/company-settings";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`stripe-dashboard:${getClientIp(request)}`, 10, 60_000);
  if (!limit.ok) return rateLimitResponse(limit);

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getCompanySettings(companyId);
  const accountId = settings?.stripe_connect_account_id ?? null;
  if (!accountId) {
    return NextResponse.json(
      { error: "Connect your Stripe account first (Settings → Payments)." },
      { status: 400 }
    );
  }

  try {
    const link = await stripe().accounts.createLoginLink(accountId);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    console.error("[stripe/dashboard] createLoginLink failed", err);
    return NextResponse.json(
      { error: "Couldn't open your Stripe dashboard. Make sure your Stripe setup is finished." },
      { status: 500 }
    );
  }
}
