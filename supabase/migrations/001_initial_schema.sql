-- =============================================================================
-- TerraFlow — Initial schema (single-tenant)
-- =============================================================================
-- All tables use uuid PK, created_at/updated_at timestamps, and FKs that mirror
-- the TypeScript types in src/data/types.ts. Apply via Supabase SQL Editor.
-- =============================================================================

-- Trigger function to keep updated_at in sync on every UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Enums
-- =============================================================================
create type contact_type        as enum ('residential', 'commercial');
create type location_billing    as enum ('per_visit', 'monthly_contract');
create type project_status      as enum ('draft', 'proposed', 'scheduled', 'in_progress', 'completed', 'archived');
create type acceptance_state    as enum ('pending', 'accepted', 'declined');
create type bid_status          as enum ('draft', 'sent', 'accepted', 'declined');
create type bid_mode            as enum ('quick', 'detailed', 'tiered');
create type pct_or_dollar       as enum ('percent', 'dollar');
create type labor_cost_mode     as enum ('overhead', 'line_item');
create type unit_kind           as enum ('ea', 'sq_ft', 'ton', 'hr', 'other');
create type pricing_strategy    as enum ('cost_plus', 'pre_marked');
create type payment_type        as enum ('deposit', 'final', 'invoice', 'maintenance');
create type payment_status      as enum ('unpaid', 'processing', 'succeeded', 'failed', 'partially_refunded', 'refunded');
create type employee_role       as enum ('admin', 'manager', 'employee');
create type employee_status     as enum ('active', 'inactive');
create type maint_plan_status   as enum ('active', 'paused', 'cancelled', 'completed');
create type maint_frequency     as enum ('weekly', 'biweekly', 'monthly', 'quarterly', 'annually', 'custom');
create type maint_billing       as enum ('per_visit', 'monthly', 'quarterly', 'annually');
create type maint_visit_status  as enum ('scheduled', 'completed', 'cancelled', 'skipped');
create type maint_payment_status as enum ('unpaid', 'paid', 'processing');
create type maint_pricing_type  as enum ('per_unit', 'flat_rate', 'variable');
create type hard_cost_category  as enum ('equipment', 'insurance', 'rent', 'software', 'fuel', 'vehicle', 'other');
create type hard_cost_basis     as enum ('per_job', 'per_visit', 'per_hour', 'flat');
create type milestone_status    as enum ('not_started', 'in_progress', 'done');
create type schedule_block_type as enum ('project', 'maintenance', 'custom');
create type comm_type           as enum ('email', 'sms', 'call', 'note');
create type comm_direction      as enum ('inbound', 'outbound');
create type comm_channel        as enum ('reminder', 'payment_link', 'invoice', 'estimate', 'follow_up', 'manual', 'system');
create type comm_status         as enum ('sent', 'delivered', 'read', 'failed');
create type comm_related_type   as enum ('visit', 'invoice', 'bid', 'project', 'general');
create type d2d_status          as enum ('interested', 'follow_up', 'no_answer', 'not_interested', 'do_not_knock', 'made_sale', 'maintenance_customer');
create type membership_role     as enum ('owner', 'admin', 'member');

-- =============================================================================
-- Contacts
-- =============================================================================
create table contacts (
  id              uuid primary key default gen_random_uuid(),
  first_name      text not null,
  last_name       text not null,
  phone           text,
  email           text,
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  zip             text,
  notes           text,
  portal_token    text,
  is_archived     boolean default false,
  archived_at     timestamptz,
  latitude        double precision,
  longitude       double precision,
  source          text,
  tags            text[],
  contact_type    contact_type,
  company_name    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_contacts_archived on contacts (is_archived) where is_archived = false;
create index idx_contacts_email on contacts (lower(email)) where email is not null;
create trigger trg_contacts_updated before update on contacts for each row execute function set_updated_at();

-- =============================================================================
-- Locations
-- =============================================================================
create table locations (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references contacts(id) on delete cascade,
  name            text not null,
  address_line1   text not null,
  address_line2   text,
  city            text not null,
  state           text not null,
  zip             text not null,
  latitude        double precision,
  longitude       double precision,
  notes           text,
  is_primary      boolean default false,
  billing_type    location_billing,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_locations_contact on locations (contact_id);
create trigger trg_locations_updated before update on locations for each row execute function set_updated_at();

-- =============================================================================
-- Employees & Teams
-- =============================================================================
create table employees (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  display_name  text,
  email         text,
  phone         text,
  role          employee_role not null default 'employee',
  status        employee_status default 'active',
  hourly_rate   numeric(10,2),
  color         text,
  user_id       uuid,  -- FK to auth.users.id when wired
  team_id       uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_employees_updated before update on employees for each row execute function set_updated_at();

create table teams (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  color           text,
  member_ids      uuid[],
  lead_id         uuid references employees(id) on delete set null,
  start_address   text,
  start_lat       double precision,
  start_lng       double precision,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_teams_updated before update on teams for each row execute function set_updated_at();

-- Add the FK from employees → teams now that teams exists
alter table employees
  add constraint fk_employees_team foreign key (team_id) references teams(id) on delete set null;

-- =============================================================================
-- Bids
-- =============================================================================
create table bids (
  id                              uuid primary key default gen_random_uuid(),
  contact_id                      uuid not null references contacts(id) on delete cascade,
  project_id                      uuid,  -- circular FK added after projects table
  status                          bid_status not null default 'draft',
  title                           text,
  description                     text,
  direct_cost_subtotal            numeric(12,2),
  overhead_total                  numeric(12,2),
  profit_type                     pct_or_dollar,
  profit_value                    numeric(12,4),
  bid_total                       numeric(12,2),
  deposit_type                    pct_or_dollar,
  deposit_value                   numeric(12,4),
  deposit_amount                  numeric(12,2),
  payment_method_ach_enabled      boolean default true,
  payment_method_card_enabled     boolean default true,
  scheduling_preference           text,
  theme_id                        uuid,
  labor_hourly_wage               numeric(10,2),
  labor_hours_per_day             numeric(6,2),
  labor_estimate_total            numeric(12,2),
  labor_cost_mode_snapshot        labor_cost_mode,
  bid_mode                        bid_mode,
  archived_at                     timestamptz,
  deleted_at                      timestamptz,
  sent_at                         timestamptz,
  accepted_at                     timestamptz,
  tiers                           jsonb,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);
create index idx_bids_contact on bids (contact_id);
create index idx_bids_status on bids (status) where deleted_at is null;
create trigger trg_bids_updated before update on bids for each row execute function set_updated_at();

create table bid_line_items (
  id           uuid primary key default gen_random_uuid(),
  bid_id       uuid not null references bids(id) on delete cascade,
  item_name    text not null,
  category     text,
  unit         unit_kind not null default 'ea',
  qty          numeric(12,4) not null default 0,
  unit_cost    numeric(12,4) not null default 0,
  sell_price   numeric(12,4),
  notes        text,
  sort_order   integer default 0,
  tier_index   integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_bid_line_items_bid on bid_line_items (bid_id);
create trigger trg_bid_line_items_updated before update on bid_line_items for each row execute function set_updated_at();

create table bid_overheads (
  id          uuid primary key default gen_random_uuid(),
  bid_id      uuid not null references bids(id) on delete cascade,
  name        text not null,
  type        pct_or_dollar not null,
  value       numeric(12,4) not null,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_bid_overheads_bid on bid_overheads (bid_id);
create trigger trg_bid_overheads_updated before update on bid_overheads for each row execute function set_updated_at();

-- =============================================================================
-- Projects
-- =============================================================================
create table projects (
  id                       uuid primary key default gen_random_uuid(),
  contact_id               uuid not null references contacts(id) on delete cascade,
  location_id              uuid references locations(id) on delete set null,
  title                    text not null,
  description              text,
  status                   project_status default 'draft',
  acceptance_state         acceptance_state default 'pending',
  scheduled_start_date     date,
  scheduled_end_date       date,
  crew_size_required       integer,
  duration_days            integer,
  consecutive_days         boolean default true,
  capacity_warn            boolean default false,
  is_completed             boolean default false,
  archived_at              timestamptz,
  bid_id                   uuid references bids(id) on delete set null,
  total_amount             numeric(12,2),
  assigned_employee_ids    uuid[],
  assigned_team_id         uuid references teams(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_projects_contact on projects (contact_id);
create index idx_projects_status on projects (status);
create index idx_projects_scheduled_start on projects (scheduled_start_date);
create trigger trg_projects_updated before update on projects for each row execute function set_updated_at();

-- Now add the bids → projects FK
alter table bids
  add constraint fk_bids_project foreign key (project_id) references projects(id) on delete set null;

-- =============================================================================
-- Payments
-- =============================================================================
create table payments (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid references projects(id) on delete set null,
  contact_id                  uuid not null references contacts(id) on delete cascade,
  location_id                 uuid references locations(id) on delete set null,
  bid_id                      uuid references bids(id) on delete set null,
  type                        payment_type not null,
  amount                      numeric(12,2) not null,
  stripe_payment_intent_id    text,
  status                      payment_status not null default 'unpaid',
  payment_method              text,
  description                 text,
  due_date                    date,
  paid_date                   timestamptz,
  maintenance_visit_id        uuid,  -- FK added after maintenance_visits exists
  maintenance_plan_id         uuid,
  idempotency_key             text unique,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index idx_payments_contact on payments (contact_id);
create index idx_payments_project on payments (project_id);
create index idx_payments_status on payments (status);
create index idx_payments_stripe_pi on payments (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
create trigger trg_payments_updated before update on payments for each row execute function set_updated_at();

-- =============================================================================
-- Maintenance
-- =============================================================================
create table maintenance_plans (
  id                        uuid primary key default gen_random_uuid(),
  contact_id                uuid not null references contacts(id) on delete cascade,
  location_id               uuid references locations(id) on delete set null,
  title                     text not null,
  status                    maint_plan_status not null default 'active',
  frequency                 maint_frequency not null,
  services                  jsonb,
  billing_method            maint_billing,
  price_per_visit           numeric(10,2),
  monthly_price             numeric(10,2),
  start_date                date,
  end_date                  date,
  assigned_employee_ids     uuid[],
  assigned_team_id          uuid references teams(id) on delete set null,
  day_of_week               integer check (day_of_week between 0 and 6),
  notes                     text,
  deleted_at                timestamptz,
  upsells                   jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index idx_maintenance_plans_contact on maintenance_plans (contact_id);
create trigger trg_maintenance_plans_updated before update on maintenance_plans for each row execute function set_updated_at();

create table maintenance_visits (
  id                       uuid primary key default gen_random_uuid(),
  maintenance_plan_id      uuid not null references maintenance_plans(id) on delete cascade,
  contact_id               uuid not null references contacts(id) on delete cascade,
  location_id              uuid references locations(id) on delete set null,
  visit_date               date not null,
  status                   maint_visit_status not null default 'scheduled',
  service_performed        text,
  notes                    text,
  assigned_employee_ids    uuid[],
  assigned_team_id         uuid references teams(id) on delete set null,
  duration_minutes         integer,
  start_time               time,
  end_time                 time,
  amount_due               numeric(10,2),
  payment_status           maint_payment_status default 'unpaid',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_maintenance_visits_plan on maintenance_visits (maintenance_plan_id);
create index idx_maintenance_visits_date on maintenance_visits (visit_date);
create trigger trg_maintenance_visits_updated before update on maintenance_visits for each row execute function set_updated_at();

-- Now add the payments → maintenance FKs
alter table payments
  add constraint fk_payments_maint_visit foreign key (maintenance_visit_id) references maintenance_visits(id) on delete set null,
  add constraint fk_payments_maint_plan  foreign key (maintenance_plan_id)  references maintenance_plans(id)  on delete set null;

create table maintenance_items (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  pricing_type     maint_pricing_type not null,
  unit_label       text,
  price_per_unit   numeric(10,2),
  avg_minutes_per_unit integer,
  price_per_visit  numeric(10,2),
  suggested_min    numeric(10,2),
  suggested_max    numeric(10,2),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_maintenance_items_updated before update on maintenance_items for each row execute function set_updated_at();

-- =============================================================================
-- Items catalog & categories
-- =============================================================================
create table items_catalog (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  category             text,
  unit                 unit_kind not null default 'ea',
  pricing_strategy     pricing_strategy not null default 'cost_plus',
  default_unit_cost    numeric(12,4),
  default_sell_price   numeric(12,4),
  vendor               text,
  sort_order           integer default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create trigger trg_items_catalog_updated before update on items_catalog for each row execute function set_updated_at();

create table item_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_item_categories_updated before update on item_categories for each row execute function set_updated_at();

-- =============================================================================
-- Hard costs (overhead expenses)
-- =============================================================================
create table hard_costs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  monthly_cost  numeric(10,2) not null default 0,
  category      hard_cost_category,
  cost_basis    hard_cost_basis,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_hard_costs_updated before update on hard_costs for each row execute function set_updated_at();

-- =============================================================================
-- Company settings (single-row but keyed for future multi-tenant)
-- =============================================================================
create table company_settings (
  id                            uuid primary key default gen_random_uuid(),
  company_name                  text,
  logo_url                      text,
  crews_total                   integer,
  crew_size_per_team            integer,
  stripe_connect_account_id     text,
  stripe_connect_status         text,
  default_theme_id              uuid,
  default_hourly_wage           numeric(10,2),
  default_hours_per_day         numeric(6,2),
  labor_cost_mode               labor_cost_mode default 'overhead',
  google_maps_api_key           text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);
create trigger trg_company_settings_updated before update on company_settings for each row execute function set_updated_at();

-- =============================================================================
-- Milestones, Photos, Proposals
-- =============================================================================
create table milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  index       integer not null,
  name        text not null,
  status      milestone_status not null default 'not_started',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_milestones_project on milestones (project_id);
create trigger trg_milestones_updated before update on milestones for each row execute function set_updated_at();

create table photos (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references projects(id) on delete cascade,
  contact_id              uuid references contacts(id) on delete set null,
  uploaded_by_user_id     uuid,
  uploaded_at             timestamptz default now(),
  url                     text not null,
  caption                 text,
  milestone_id            uuid references milestones(id) on delete set null,
  tags                    text[],
  geo_lat                 double precision,
  geo_lng                 double precision,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index idx_photos_project on photos (project_id);
create trigger trg_photos_updated before update on photos for each row execute function set_updated_at();

create table proposals (
  id          uuid primary key default gen_random_uuid(),
  bid_id      uuid not null references bids(id) on delete cascade,
  pdf_url     text,
  sent_at     timestamptz,
  content     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_proposals_bid on proposals (bid_id);
create trigger trg_proposals_updated before update on proposals for each row execute function set_updated_at();

create table proposal_themes (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  brand_color_primary      text,
  brand_font_heading       text,
  brand_font_body          text,
  show_line_items          boolean default true,
  show_category_subtotals  boolean default false,
  show_total_only          boolean default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger trg_proposal_themes_updated before update on proposal_themes for each row execute function set_updated_at();

-- =============================================================================
-- Overhead templates
-- =============================================================================
create table overhead_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_overhead_templates_updated before update on overhead_templates for each row execute function set_updated_at();

create table overhead_template_lines (
  id                       uuid primary key default gen_random_uuid(),
  overhead_template_id     uuid not null references overhead_templates(id) on delete cascade,
  name                     text not null,
  type                     pct_or_dollar not null,
  value                    numeric(12,4) not null,
  enabled                  boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_overhead_template_lines_template on overhead_template_lines (overhead_template_id);
create trigger trg_overhead_template_lines_updated before update on overhead_template_lines for each row execute function set_updated_at();

-- =============================================================================
-- Schedule blocks & route plans
-- =============================================================================
create table schedule_blocks (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid references projects(id) on delete cascade,
  maintenance_visit_id     uuid references maintenance_visits(id) on delete cascade,
  location_id              uuid references locations(id) on delete set null,
  title                    text not null,
  start_date               date not null,
  end_date                 date not null,
  start_time               time,
  end_time                 time,
  assigned_employee_ids    uuid[],
  assigned_team_id         uuid references teams(id) on delete set null,
  block_type               schedule_block_type not null,
  color                    text,
  notes                    text,
  all_day                  boolean default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_schedule_blocks_dates on schedule_blocks (start_date, end_date);
create index idx_schedule_blocks_project on schedule_blocks (project_id) where project_id is not null;
create trigger trg_schedule_blocks_updated before update on schedule_blocks for each row execute function set_updated_at();

create table route_plans (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  date                      date not null,
  team_id                   uuid references teams(id) on delete set null,
  stops                     jsonb,
  optimized                 boolean default false,
  total_distance_miles      numeric(10,2),
  total_duration_minutes    integer,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create trigger trg_route_plans_updated before update on route_plans for each row execute function set_updated_at();

-- =============================================================================
-- Communications log
-- =============================================================================
create table communications (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references contacts(id) on delete cascade,
  type            comm_type not null,
  direction       comm_direction,
  channel         comm_channel,
  subject         text,
  body            text,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  status          comm_status,
  related_type    comm_related_type,
  related_id      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_communications_contact on communications (contact_id);
create index idx_communications_sent_at on communications (sent_at desc);
create trigger trg_communications_updated before update on communications for each row execute function set_updated_at();

-- =============================================================================
-- Door-to-door pins
-- =============================================================================
create table door_to_door_pins (
  id                      uuid primary key default gen_random_uuid(),
  address                 text not null,
  lat                     double precision not null,
  lng                     double precision not null,
  status                  d2d_status not null,
  contact_id              uuid references contacts(id) on delete set null,
  notes                   text,
  visited_at              timestamptz,
  assigned_employee_id    uuid references employees(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index idx_d2d_pins_status on door_to_door_pins (status);
create trigger trg_d2d_pins_updated before update on door_to_door_pins for each row execute function set_updated_at();

-- =============================================================================
-- Roles & memberships
-- =============================================================================
create table role_permissions (
  id           uuid primary key default gen_random_uuid(),
  role         employee_role not null unique,
  permissions  text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_role_permissions_updated before update on role_permissions for each row execute function set_updated_at();

create table company_memberships (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,  -- FK to auth.users.id
  role        membership_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index idx_company_memberships_user on company_memberships (user_id);
create trigger trg_company_memberships_updated before update on company_memberships for each row execute function set_updated_at();
