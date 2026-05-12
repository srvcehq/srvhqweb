import { NextRequest, NextResponse } from "next/server";
import { getCurrentCompanyId, upsertCompanySettings } from "@/lib/company-settings";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { relativeRedirect } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAPACITY = 10;
const WINDOW_MS = 60_000;

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(
    `onboarding-complete:${getClientIp(request)}`,
    CAPACITY,
    WINDOW_MS
  );
  if (!limit.ok) return rateLimitResponse(limit);

  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Finish the earlier onboarding steps first." },
      { status: 400 }
    );
  }

  const result = await upsertCompanySettings(companyId, {
    onboarding_completed_at: new Date().toISOString(),
  });
  if (!result.ok) {
    console.error("[onboarding/complete] update error", result.error);
    return NextResponse.json(
      { error: "Failed to mark onboarding complete" },
      { status: 500 }
    );
  }

  return relativeRedirect("/dashboard");
}
