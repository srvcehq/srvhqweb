import { redirect } from "next/navigation";
import { getCompanySettings, getCurrentCompanyId } from "@/lib/company-settings";
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
  searchParams: Promise<{ step?: string; stripe?: string; restart?: string }>;
}) {
  const params = await searchParams;

  // The user may not have a company yet (just signed up) — that's fine; the
  // business-info step will create one. Once they do, prefill from it.
  const companyId = await getCurrentCompanyId();
  const settings = companyId ? await getCompanySettings(companyId) : null;

  // Normally an already-onboarded account hitting /onboarding bounces to the
  // dashboard. `?restart=1` lets you walk the wizard again (handy for demos).
  if (settings?.onboarding_completed_at && params.restart !== "1") {
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
