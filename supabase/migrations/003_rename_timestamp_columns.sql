-- =============================================================================
-- Rename created_at/updated_at → created_date/updated_date everywhere
-- =============================================================================
-- The TypeScript BaseEntity type already uses created_date/updated_date across
-- 78 occurrences in the codebase. Renaming the DB columns (instead of touching
-- every TS file) keeps Supabase rows compatible with the existing types.
-- =============================================================================

-- Update the trigger function to write to updated_date
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'contacts', 'locations', 'employees', 'teams',
    'bids', 'bid_line_items', 'bid_overheads',
    'projects', 'payments',
    'maintenance_plans', 'maintenance_visits', 'maintenance_items',
    'items_catalog', 'item_categories', 'hard_costs',
    'company_settings', 'milestones', 'photos', 'proposals', 'proposal_themes',
    'overhead_templates', 'overhead_template_lines',
    'schedule_blocks', 'route_plans', 'communications',
    'door_to_door_pins', 'role_permissions', 'company_memberships'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I rename column created_at to created_date', t);
    execute format('alter table %I rename column updated_at to updated_date', t);
  end loop;
end $$;

-- Match the TS camelCase fields used by existing UI code
alter table contacts           rename column is_archived to "isArchived";
alter table maintenance_visits rename column amount_due  to "amountDue";
