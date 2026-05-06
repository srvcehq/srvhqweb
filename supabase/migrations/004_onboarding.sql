-- =============================================================================
-- 004 — Onboarding columns on company_settings
-- =============================================================================
-- Apply via Supabase SQL editor. The first-run wizard collects business
-- contact info into these columns and flips onboarding_completed_at when the
-- user finishes the flow. Gating in src/app/page.tsx keys off the latter.
-- =============================================================================

alter table company_settings
  add column if not exists business_phone        text,
  add column if not exists business_address      text,
  add column if not exists onboarding_completed_at timestamptz;
