import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type StripeSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

export interface BillingRow {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: StripeSubscriptionStatus | null;
  subscription_price_id: string | null;
  subscription_current_period_end: string | null;
  trial_ends_at: string | null;
}

const SELECT =
  "id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_price_id, subscription_current_period_end, trial_ends_at";

const ACTIVE_STATUSES: ReadonlySet<StripeSubscriptionStatus> = new Set([
  "trialing",
  "active",
  "past_due",
]);

export function isActiveStatus(
  status: StripeSubscriptionStatus | null | undefined
): boolean {
  return !!status && ACTIVE_STATUSES.has(status);
}

/**
 * Returns the company's billing row, or null if the migration hasn't been
 * applied yet (PostgREST 42703 = column does not exist). The middleware
 * treats either null or an inactive status as "not subscribed".
 */
export async function getBilling(): Promise<BillingRow | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("company_settings")
      .select(SELECT)
      .maybeSingle();
    if (error) {
      if (error.code === "42703" || /column .* does not exist/i.test(error.message)) {
        return null;
      }
      console.error("[billing] read failed:", error.message);
      return null;
    }
    return (data as BillingRow | null) ?? null;
  } catch (err) {
    console.error("[billing] read threw:", err);
    return null;
  }
}

export async function patchBillingByCustomerId(
  stripeCustomerId: string,
  patch: Partial<Omit<BillingRow, "id">>
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("company_settings")
    .update(patch as never)
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    console.error(`[billing] patch by customer ${stripeCustomerId} failed:`, error.message);
  }
}

export async function patchBillingById(
  id: string,
  patch: Partial<Omit<BillingRow, "id">>
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("company_settings")
    .update(patch as never)
    .eq("id", id);
  if (error) {
    console.error(`[billing] patch by id ${id} failed:`, error.message);
  }
}
