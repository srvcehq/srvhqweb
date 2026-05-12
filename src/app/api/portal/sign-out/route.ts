import { clearPortalSession } from "@/lib/portal-session";
import { relativeRedirect } from "@/lib/http";

export const runtime = "nodejs";

export async function POST() {
  await clearPortalSession();
  return relativeRedirect("/portal?signed_out=1");
}
