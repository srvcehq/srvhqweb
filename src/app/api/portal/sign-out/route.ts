import { NextResponse } from "next/server";
import { clearPortalSession } from "@/lib/portal-session";

export const runtime = "nodejs";

export async function POST() {
  await clearPortalSession();
  return NextResponse.redirect(
    new URL("/portal?signed_out=1", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    { status: 303 },
  );
}
