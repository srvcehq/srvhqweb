import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerEnv, publicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBilling, patchBillingById } from "@/lib/billing";
import { getCompanySettings, getCurrentCompanyId } from "@/lib/company-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const plan = form?.get("plan") === "annual" ? "annual" : "monthly";
  const env = getServerEnv();
  const priceId = plan === "annual" ? env.STRIPE_PRICE_ID_ANNUAL : env.STRIPE_PRICE_ID_MONTHLY;
  if (!priceId) {
    return NextResponse.json(
      { error: `STRIPE_PRICE_ID_${plan.toUpperCase()} is not configured` },
      { status: 500 }
    );
  }

  const companyId = await getCurrentCompanyId();
  const settings = companyId ? await getCompanySettings(companyId) : null;
  if (!settings) {
    return NextResponse.json(
      { error: "Company settings row missing — finish onboarding first" },
      { status: 400 }
    );
  }

  const billing = await getBilling();
  let customerId = billing?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email ?? undefined,
      name: settings.company_name ?? undefined,
      metadata: { company_settings_id: settings.id, user_id: user.id },
    });
    customerId = customer.id;
    await patchBillingById(settings.id, { stripe_customer_id: customerId });
  }

  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/billing/locked`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: {
      metadata: { company_settings_id: settings.id, user_id: user.id, plan },
    },
    metadata: { company_settings_id: settings.id, user_id: user.id, plan },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Checkout session missing URL" }, { status: 500 });
  }
  return NextResponse.redirect(session.url, 303);
}
