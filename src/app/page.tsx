import { redirect } from "next/navigation";
import { getCompanySettings } from "@/lib/company-settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getCompanySettings();
  redirect(settings?.onboarding_completed_at ? "/dashboard" : "/onboarding");
}
