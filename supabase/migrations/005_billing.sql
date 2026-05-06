-- 005_billing.sql
-- Adds SaaS subscription state to company_settings.
-- One subscription per company (single-tenant today; scales to multi-tenant when
-- each tenant gets its own company_settings row).
--
-- subscription_status mirrors Stripe's enum:
--   trialing | active | past_due | canceled | incomplete | incomplete_expired | unpaid
-- Access is granted when status IN ('trialing','active','past_due').
-- NULL = never subscribed.

alter table company_settings
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_price_id text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists trial_ends_at timestamptz;

create index if not exists idx_company_settings_stripe_customer
  on company_settings (stripe_customer_id);

create index if not exists idx_company_settings_stripe_subscription
  on company_settings (stripe_subscription_id);
