import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { upsertCompanySettings } from "@/lib/company-settings";

export const runtime = "nodejs";

const CONNECT_CAPACITY = 3;
const CONNECT_WINDOW_MS = 60_000;

const bodySchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email().optional(),
  country: z.string().length(2).default("US"),
  existingAccountId: z.string().optional(),
  from: z.enum(["settings", "onboarding"]).default("settings"),
});

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`connect:${getClientIp(request)}`, CONNECT_CAPACITY, CONNECT_WINDOW_MS);
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
    let accountId = parsed.existingAccountId ?? null;
    if (!accountId) {
      const account = await stripe().accounts.create({
        type: "express",
        country: parsed.country,
        email: parsed.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "company",
        metadata: { company_id: parsed.companyId },
      });
      accountId = account.id;
      // Persist immediately so a refresh mid-flow doesn't lose the account ID.
      await upsertCompanySettings({
        stripe_connect_account_id: accountId,
        stripe_connect_status: "pending",
      });
    }

    const base = publicEnv.NEXT_PUBLIC_APP_URL;
    const returnUrl =
      parsed.from === "onboarding"
        ? `${base}/onboarding?step=3&stripe=connected`
        : `${base}/settings?stripe=connected`;
    const refreshUrl =
      parsed.from === "onboarding"
        ? `${base}/onboarding?step=3&stripe=refresh`
        : `${base}/settings?stripe=refresh`;

    const link = await stripe().accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ accountId, url: link.url });
  } catch (err) {
    console.error("[stripe/connect] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create Connect onboarding link", message }, { status: 500 });
  }
}
