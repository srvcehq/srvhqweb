import { NextRequest, NextResponse } from "next/server";
import { upsertCompanySettings } from "@/lib/company-settings";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

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

  const result = await upsertCompanySettings({
    onboarding_completed_at: new Date().toISOString(),
  });

  if (!result.ok) {
    console.error("[onboarding/complete] upsert error", result.error);
    return NextResponse.json(
      { error: "Failed to mark onboarding complete" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}
