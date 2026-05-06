import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
 * Read the single company_settings row.
 *
 * Single-tenant for now — multi-tenant will need a tenant scope here.
 */
export async function getCompanySettings(): Promise<CompanySettingsRow | null> {
  const { data } = await getSupabaseAdmin()
    .from("company_settings")
    .select(FULL_SELECT)
    .maybeSingle();
  return (data as CompanySettingsRow | null) ?? null;
}

/**
 * UPDATE the existing row, or INSERT if there isn't one.
 * Returns the existing row's id (or null on insert).
 */
export async function upsertCompanySettings(
  patch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  const existing = await getCompanySettings();

  if (existing) {
    const { error } = await supabase
      .from("company_settings")
      .update(patch as never)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("company_settings")
      .insert(patch as never);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}
