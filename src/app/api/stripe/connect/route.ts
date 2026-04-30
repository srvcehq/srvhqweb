import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";

export const runtime = "nodejs";

const bodySchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email().optional(),
  country: z.string().length(2).default("US"),
  existingAccountId: z.string().optional(),
});

export async function POST(request: NextRequest) {
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
    const accountId =
      parsed.existingAccountId ??
      (
        await stripe().accounts.create({
          type: "express",
          country: parsed.country,
          email: parsed.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "company",
          metadata: { company_id: parsed.companyId },
        })
      ).id;

    const link = await stripe().accountLinks.create({
      account: accountId,
      refresh_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/settings?stripe=refresh`,
      return_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/settings?stripe=connected`,
      type: "account_onboarding",
    });

    return NextResponse.json({ accountId, url: link.url });
  } catch (err) {
    console.error("[stripe/connect] error", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Failed to create Connect onboarding link", message }, { status: 500 });
  }
}
