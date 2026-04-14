export interface BaseEntity {
  id: string;
  created_date: string;
  updated_date: string;
  company_id?: string;
}

export interface Contact extends BaseEntity {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  portal_token?: string;
  isArchived?: boolean;
  archived_at?: string | null;
  latitude?: number;
  longitude?: number;
  source?: string;
  tags?: string[];
  contact_type?: "residential" | "commercial";
  company_name?: string;
}

export interface Location extends BaseEntity {
  contact_id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  is_primary?: boolean;
  billing_type?: "per_visit" | "monthly_contract";
}

export interface Project extends BaseEntity {
  contact_id: string;
  location_id?: string;
  title: string;
  description?: string;
  status?: "draft" | "proposed" | "scheduled" | "in_progress" | "completed" | "archived";
  acceptance_state?: "pending" | "accepted" | "declined";
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  crew_size_required?: number;
  duration_days?: number;
  consecutive_days?: boolean;
  capacity_warn?: boolean;
  is_completed?: boolean;
  archived_at?: string | null;
  bid_id?: string;
  total_amount?: number;
  assigned_employee_ids?: string[];
  assigned_team_id?: string;
}

export interface Bid extends BaseEntity {
  contact_id: string;
  project_id?: string;
  status: "draft" | "sent" | "accepted" | "declined";
  title?: string;
  description?: string;
  direct_cost_subtotal?: number;
  overhead_total?: number;
  profit_type?: "percent" | "dollar";
  profit_value?: number;
  bid_total?: number;
  deposit_type?: "percent" | "dollar";
  deposit_value?: number;
  deposit_amount?: number;
  payment_method_ach_enabled?: boolean;
  payment_method_card_enabled?: boolean;
  scheduling_preference?: string;
  theme_id?: string;
  labor_hourly_wage?: number;
  labor_hours_per_day?: number;
  labor_estimate_total?: number;
  labor_cost_mode_snapshot?: "overhead" | "line_item";
  bid_mode?: "quick" | "detailed" | "tiered";
  archived_at?: string | null;
  deleted_at?: string | null;
  sent_at?: string;
  accepted_at?: string;
  tiers?: BidTier[];
}

export interface BidTier {
  name: string;
  description?: string;
  line_items?: BidLineItem[];
  total?: number;
}

export interface BidLineItem extends BaseEntity {
  bid_id: string;
  item_name: string;
  category?: string;
  unit: "ea" | "sq_ft" | "ton" | "hr" | "other";
  qty: number;
  unit_cost: number;
  sell_price?: number;
  notes?: string;
  sort_order?: number;
  tier_index?: number;
}

export interface BidOverhead extends BaseEntity {
  bid_id: string;
  name: string;
  type: "percent" | "dollar";
  value: number;
  enabled: boolean;
}

export interface Payment extends BaseEntity {
  project_id?: string;
  contact_id: string;
  location_id?: string;
  bid_id?: string;
  type: "deposit" | "final" | "invoice" | "maintenance";
  amount: number;
  stripe_payment_intent_id?: string;
  status: "unpaid" | "processing" | "succeeded" | "failed" | "partially_refunded" | "refunded";
  payment_method?: string;
  description?: string;
  due_date?: string;
  paid_date?: string;
  maintenance_visit_id?: string;
  maintenance_plan_id?: string;
  idempotency_key?: string;
}

export interface Employee extends BaseEntity {
  first_name: string;
  last_name: string;
  display_name?: string;
  email?: string;
  phone?: string;
  role: "admin" | "manager" | "employee";
  status?: "active" | "inactive";
  hourly_rate?: number;
  color?: string;
  user_id?: string;
  team_id?: string;
}

export interface Team extends BaseEntity {
  name: string;
  color?: string;
  member_ids?: string[];
  lead_id?: string;
  start_address?: string;
  start_lat?: number;
  start_lng?: number;
}

export interface MaintenancePlan extends BaseEntity {
  contact_id: string;
  location_id?: string;
  title: string;
  status: "active" | "paused" | "cancelled" | "completed";
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "annually" | "custom";
  services?: MaintenanceService[];
  billing_method?: "per_visit" | "monthly" | "quarterly" | "annually";
  price_per_visit?: number;
  monthly_price?: number;
  start_date?: string;
  end_date?: string;
  assigned_employee_ids?: string[];
  assigned_team_id?: string;
  day_of_week?: number;
  notes?: string;
  deleted_at?: string | null;
  upsells?: MaintenanceUpsell[];
}

export interface MaintenanceService {
  id: string;
  name: string;
  price: number;
  included: boolean;
}

export interface MaintenanceUpsell {
  id: string;
  name: string;
  price: number;
  frequency: string;
}

export interface MaintenanceVisit extends BaseEntity {
  maintenance_plan_id: string;
  contact_id: string;
  location_id?: string;
  visit_date: string;
  status: "scheduled" | "completed" | "cancelled" | "skipped";
  service_performed?: string;
  notes?: string;
  assigned_employee_ids?: string[];
  assigned_team_id?: string;
  duration_minutes?: number;
  start_time?: string;
  end_time?: string;
  amountDue?: number;
  payment_status?: "unpaid" | "paid" | "processing";
}

export interface MaintenanceItem extends BaseEntity {
  name: string;
  description?: string;
  pricing_type: "per_unit" | "flat_rate" | "variable";
  unit_label?: string;
  price_per_unit?: number;
  avg_minutes_per_unit?: number;
  price_per_visit?: number;
  suggested_min?: number;
  suggested_max?: number;
  is_active: boolean;
}

export interface ItemsCatalog extends BaseEntity {
  name: string;
  category?: string;
  unit: "ea" | "sq_ft" | "ton" | "hr" | "other";
  pricing_strategy: "cost_plus" | "pre_marked";
  default_unit_cost?: number;
  default_sell_price?: number;
  vendor?: string;
  sort_order?: number;
}

export interface ItemCategory extends BaseEntity {
  name: string;
  sort_order: number;
}

export interface HardCost extends BaseEntity {
  name: string;
  monthly_cost: number;
  category?: "equipment" | "insurance" | "rent" | "software" | "fuel" | "vehicle" | "other";
  cost_basis?: "per_job" | "per_visit" | "per_hour" | "flat";
  notes?: string;
  is_active: boolean;
}

export interface CompanySetting extends BaseEntity {
  company_name?: string;
  logo_url?: string;
  crews_total?: number;
  crew_size_per_team?: number;
  stripe_connect_account_id?: string;
  stripe_connect_status?: string;
  default_theme_id?: string;
  default_hourly_wage?: number;
  default_hours_per_day?: number;
  labor_cost_mode?: "overhead" | "line_item";
  google_maps_api_key?: string;
}

export interface Milestone extends BaseEntity {
  project_id: string;
  index: number;
  name: string;
  status: "not_started" | "in_progress" | "done";
  notes?: string;
}

export interface Photo extends BaseEntity {
  project_id: string;
  contact_id?: string;
  uploaded_by_user_id?: string;
  uploaded_at?: string;
  url: string;
  caption?: string;
  milestone_id?: string;
  tags?: string[];
  geo_lat?: number;
  geo_lng?: number;
}

export interface Proposal extends BaseEntity {
  bid_id: string;
  pdf_url?: string;
  sent_at?: string;
  content?: string;
}

export interface ProposalTheme extends BaseEntity {
  name: string;
  brand_color_primary?: string;
  brand_font_heading?: string;
  brand_font_body?: string;
  show_line_items?: boolean;
  show_category_subtotals?: boolean;
  show_total_only?: boolean;
}

export interface OverheadTemplate extends BaseEntity {
  name: string;
}

export interface OverheadTemplateLine extends BaseEntity {
  overhead_template_id: string;
  name: string;
  type: "percent" | "dollar";
  value: number;
  enabled: boolean;
}

export interface ScheduleBlock extends BaseEntity {
  project_id?: string;
  maintenance_visit_id?: string;
  location_id?: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  assigned_employee_ids?: string[];
  assigned_team_id?: string;
  block_type: "project" | "maintenance" | "custom";
  color?: string;
  notes?: string;
  all_day?: boolean;
}

export interface RoutePlan extends BaseEntity {
  name: string;
  date: string;
  team_id?: string;
  stops?: RouteStop[];
  optimized?: boolean;
  total_distance_miles?: number;
  total_duration_minutes?: number;
}

export interface RouteStop {
  id: string;
  contact_id?: string;
  maintenance_visit_id?: string;
  location_id?: string;
  address: string;
  lat?: number;
  lng?: number;
  order: number;
  arrival_time?: string;
  duration_minutes?: number;
}

export interface Communication extends BaseEntity {
  contact_id: string;
  type: "email" | "sms" | "call" | "note";
  direction?: "inbound" | "outbound";
  channel?: "reminder" | "payment_link" | "invoice" | "estimate" | "follow_up" | "manual" | "system";
  subject?: string;
  body?: string;
  sent_at?: string;
  delivered_at?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  related_type?: "visit" | "invoice" | "bid" | "project" | "general";
  related_id?: string;
}

export interface DoorToDoorPin extends BaseEntity {
  address: string;
  lat: number;
  lng: number;
  status: "interested" | "follow_up" | "no_answer" | "not_interested" | "do_not_knock" | "made_sale" | "maintenance_customer";
  contact_id?: string;
  notes?: string;
  visited_at?: string;
  assigned_employee_id?: string;
}

export interface RolePermission extends BaseEntity {
  role: "admin" | "manager" | "employee";
  permissions: string[];
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role?: string;
  phone?: string;
  company_name?: string;
}

export interface CompanyMembership extends BaseEntity {
  user_id: string;
  role: "owner" | "admin" | "member";
}
