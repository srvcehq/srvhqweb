import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCurrentCompanyId,
  provisionCompany,
  upsertCompanySettings,
} from "@/lib/company-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAPACITY = 10;
const WINDOW_MS = 60_000;

const bodySchema = z.object({
  company_name: z.string().trim().min(1, "Business name is required").max(200),
  business_phone: z.string().trim().max(50).optional().or(z.literal("")),
  business_address: z.string().trim().max(500).optional().or(z.literal("")),
});

function emptyToNull(v: string | undefined): string | null {
  if (v == null) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`onboarding-biz:${getClientIp(request)}`, CAPACITY, WINDOW_MS);
  if (!limit.ok) return rateLimitResponse(limit);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid input", details: err instanceof z.ZodError ? err.issues : undefined },
      { status: 400 }
    );
  }

  const fields = {
    company_name: parsed.company_name,
    business_phone: emptyToNull(parsed.business_phone),
    business_address: emptyToNull(parsed.business_address),
  };

  const companyId = await getCurrentCompanyId();
  if (companyId) {
    const result = await upsertCompanySettings(companyId, fields);
    if (!result.ok) {
      console.error("[onboarding/business-info] update error", result.error);
      return NextResponse.json({ error: "Failed to save business info" }, { status: 500 });
    }
  } else {
    const result = await provisionCompany(user.id, fields);
    if (!result.ok) {
      console.error("[onboarding/business-info] provision error", result.error);
      return NextResponse.json({ error: "Failed to save business info" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
