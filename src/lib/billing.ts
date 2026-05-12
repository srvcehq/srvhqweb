import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
 * Returns the signed-in user's company billing row, or null if they have no
 * company yet / the billing columns aren't there. Uses the user-scoped client
 * so RLS scopes it to their own company. The middleware treats either null or
 * an inactive status as "not subscribed".
 */
export async function getBilling(): Promise<BillingRow | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
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
