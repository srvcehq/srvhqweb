-- =============================================================================
-- TerraFlow — Row Level Security (single-tenant model)
-- =============================================================================
-- Default deny. Authenticated users get full read/write on every table.
-- The service_role key (used by API routes for webhooks, cron, etc.) bypasses
-- RLS entirely, so server-side jobs can always write.
--
-- When we go multi-tenant later, we'll swap each policy for a company_id check
-- against company_memberships.user_id = auth.uid().
-- =============================================================================

-- Helper: every table gets the same authenticated-only policy
do $$
declare
  t text;
  tables text[] := array[
    'contacts',
    'locations',
    'employees',
    'teams',
    'bids',
    'bid_line_items',
    'bid_overheads',
    'projects',
    'payments',
    'maintenance_plans',
    'maintenance_visits',
    'maintenance_items',
    'items_catalog',
    'item_categories',
    'hard_costs',
    'company_settings',
    'milestones',
    'photos',
    'proposals',
    'proposal_themes',
    'overhead_templates',
    'overhead_template_lines',
    'schedule_blocks',
    'route_plans',
    'communications',
    'door_to_door_pins',
    'role_permissions',
    'company_memberships'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "authenticated_full_access" on %I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;
