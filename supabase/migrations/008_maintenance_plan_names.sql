-- =============================================================================
-- 008 — Reusable maintenance-plan name templates
-- =============================================================================
-- The "Plan Basics" step of the maintenance-plan drawer lets a contractor pick
-- from (or add to / delete from) a saved list of plan names. Store that list on
-- company_settings — RLS already scopes the row to the tenant.
-- =============================================================================

alter table public.company_settings
  add column if not exists maintenance_plan_names text[] not null default '{}';
