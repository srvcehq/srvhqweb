import { redirect } from "next/navigation";
import { getCompanySettings } from "@/lib/company-settings";
import OnboardingWizard from "./onboarding-wizard";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 5;

function clampStep(raw: string | null): number {
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(Math.max(n, 1), TOTAL_STEPS);
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; stripe?: string }>;
}) {
  const params = await searchParams;
  const settings = await getCompanySettings();

  if (settings?.onboarding_completed_at) {
    redirect("/dashboard");
  }

  return (
    <OnboardingWizard
      initialStep={clampStep(params.step ?? null)}
      stripeStatusFromUrl={params.stripe ?? null}
      companyId={settings?.id ?? null}
      initialBusinessInfo={{
        company_name: settings?.company_name ?? "",
        business_phone: settings?.business_phone ?? "",
        business_address: settings?.business_address ?? "",
      }}
      stripeConnected={settings?.stripe_connect_status === "active"}
      stripeAccountId={settings?.stripe_connect_account_id ?? null}
    />
  );
}
