import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CompanySettingsRow {
  id: string;
  company_name: string | null;
  business_phone: string | null;
  business_address: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
  onboarding_completed_at: string | null;
}

const FULL_SELECT =
  "id, company_name, business_phone, business_address, stripe_connect_account_id, stripe_connect_status, onboarding_completed_at";

/**
 * The company id of the currently signed-in Supabase user, or null if they
 * don't belong to a company yet (e.g. just after signup, before onboarding).
 */
export async function getCurrentCompanyId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await getSupabaseAdmin()
    .from("company_memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as { company_id?: string } | null)?.company_id ?? null;
}

/** Read one company's settings row. */
export async function getCompanySettings(companyId: string): Promise<CompanySettingsRow | null> {
  const { data } = await getSupabaseAdmin()
    .from("company_settings")
    .select(FULL_SELECT)
    .eq("id", companyId)
    .maybeSingle();
  return (data as CompanySettingsRow | null) ?? null;
}

/** Patch one company's settings row. */
export async function upsertCompanySettings(
  companyId: string,
  patch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await getSupabaseAdmin()
    .from("company_settings")
    .update(patch as never)
    .eq("id", companyId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Create a brand-new company and link `userId` to it as the owner. Used by the
 * onboarding flow the first time a user fills in their business info. Runs via
 * the service-role key (bypasses RLS — the user has no membership yet).
 */
export async function provisionCompany(
  userId: string,
  fields: { company_name: string; business_phone: string | null; business_address: string | null }
): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  const { data: co, error: e1 } = await admin
    .from("company_settings")
    .insert({
      company_name: fields.company_name,
      business_phone: fields.business_phone,
      business_address: fields.business_address,
      // Demo: new companies skip the paywall. (Drop this when Stripe billing
      // goes live so they go through /billing/locked instead.)
      subscription_status: "active",
    } as never)
    .select("id")
    .single();
  if (e1 || !co) return { ok: false, error: e1?.message ?? "could not create company" };

  const companyId = (co as { id: string }).id;
  const { error: e2 } = await admin
    .from("company_memberships")
    .insert({ user_id: userId, company_id: companyId, role: "owner" } as never);
  if (e2) {
    // Roll back the orphaned company row so a retry doesn't leave debris.
    await admin.from("company_settings").delete().eq("id", companyId);
    return { ok: false, error: e2.message };
  }
  return { ok: true, companyId };
}
