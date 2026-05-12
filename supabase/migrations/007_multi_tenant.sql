-- =============================================================================
-- 007 — Multi-tenant data isolation
-- =============================================================================
-- Turns the previously single-tenant schema into a real multi-tenant one:
--   * company_settings.id IS the tenant/company id.
--   * company_memberships links one Supabase auth user -> one company.
--   * every per-tenant table gets `company_id` (defaulted on insert, FK'd to
--     company_settings, indexed) and an RLS policy scoping it to the caller's
--     company via auth_company_id().
--   * company_settings / company_memberships get tight RLS (read-own, no
--     user-side inserts — onboarding provisions them via the service-role key).
--   * role_permissions stays a shared lookup table (unchanged).
--
-- PREREQUISITE: run this on a CLEAN database. Before applying, run a one-time
-- wipe so every per-tenant table + company_settings + company_memberships is
-- empty — otherwise `ADD COLUMN company_id NOT NULL` fails on existing rows:
--
--   truncate
--     bid_line_items, bid_overheads, proposals, milestones, photos, schedule_blocks,
--     maintenance_visits, payments, route_plans, door_to_door_pins, communications,
--     bids, maintenance_plans, projects, locations, contacts, teams, employees,
--     overhead_template_lines, overhead_templates, items_catalog, item_categories,
--     maintenance_items, hard_costs, proposal_themes,
--     company_memberships, company_settings
--   cascade;
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. company_memberships gets company_id FIRST — the auth_company_id() helper
--    below (a SQL-language function, body validated at creation time) needs
--    the column to already exist. Table is empty -> NOT NULL is safe. No
--    DEFAULT — onboarding sets it explicitly to the new company's id.
-- ---------------------------------------------------------------------------
alter table public.company_memberships
  add column if not exists company_id uuid references public.company_settings(id) on delete cascade;

alter table public.company_memberships
  alter column company_id set not null;

create index if not exists idx_company_memberships_company on public.company_memberships(company_id);
create unique index if not exists uq_company_memberships_user on public.company_memberships(user_id);

-- ---------------------------------------------------------------------------
-- 2. Helper: the company the current Supabase user belongs to (NULL if none,
--    e.g. just after signup, or when called via the service-role key).
-- ---------------------------------------------------------------------------
create or replace function public.auth_company_id()
returns uuid
language sql
stable
as $$
  select company_id
  from public.company_memberships
  where user_id = auth.uid()
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- 3. Per-tenant tables: add company_id (defaulted, FK'd, indexed) + tenant RLS.
--    The DEFAULT means browser/RLS clients never have to pass company_id —
--    it's filled from the caller's membership on insert.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tenant_tables text[] := array[
    'contacts', 'locations', 'employees', 'teams',
    'bids', 'bid_line_items', 'bid_overheads',
    'projects', 'payments',
    'maintenance_plans', 'maintenance_visits', 'maintenance_items',
    'items_catalog', 'item_categories', 'hard_costs',
    'milestones', 'photos', 'proposals', 'proposal_themes',
    'overhead_templates', 'overhead_template_lines',
    'schedule_blocks', 'route_plans',
    'communications', 'door_to_door_pins'
  ];
begin
  foreach t in array tenant_tables loop
    execute format(
      'alter table public.%I add column if not exists company_id uuid not null default public.auth_company_id() references public.company_settings(id) on delete cascade',
      t
    );
    execute format('create index if not exists idx_%s_company on public.%I(company_id)', t, t);
    execute format('drop policy if exists "authenticated_full_access" on public.%I', t);
    execute format('drop policy if exists "tenant_isolation" on public.%I', t);
    execute format(
      'create policy "tenant_isolation" on public.%I for all to authenticated using (company_id = public.auth_company_id()) with check (company_id = public.auth_company_id())',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4. company_settings — the tenant root. Users may read/update their own row;
--    onboarding INSERTs it via the service-role key (bypasses RLS).
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated_full_access" on public.company_settings;
drop policy if exists "company_settings_select" on public.company_settings;
drop policy if exists "company_settings_update" on public.company_settings;

create policy "company_settings_select" on public.company_settings
  for select to authenticated
  using (id = public.auth_company_id());

create policy "company_settings_update" on public.company_settings
  for update to authenticated
  using (id = public.auth_company_id())
  with check (id = public.auth_company_id());

-- ---------------------------------------------------------------------------
-- 5. company_memberships — a user may read only their own membership row.
--    No user-side INSERT/UPDATE/DELETE (onboarding writes it via service role)
--    so a user can't link themselves to an arbitrary company.
-- ---------------------------------------------------------------------------
drop policy if exists "authenticated_full_access" on public.company_memberships;
drop policy if exists "membership_select" on public.company_memberships;

create policy "membership_select" on public.company_memberships
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. role_permissions stays a shared lookup (unique(role)); RLS unchanged.
-- ---------------------------------------------------------------------------
