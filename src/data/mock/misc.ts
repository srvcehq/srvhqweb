import {
  BidOverhead,
  Milestone,
  Photo,
  Proposal,
  ProposalTheme,
  OverheadTemplate,
  OverheadTemplateLine,
  RoutePlan,
  DoorToDoorPin,
  RolePermission,
  CompanyMembership,
} from "../types";

export const mockBidOverheads: Omit<BidOverhead, "id" | "created_date" | "updated_date">[] = [
  { bid_id: "1", name: "General Liability Insurance", type: "percent", value: 5, enabled: true, company_id: "1" },
  { bid_id: "1", name: "Equipment Wear & Fuel", type: "percent", value: 8, enabled: true, company_id: "1" },
  { bid_id: "1", name: "Permit Fee", type: "dollar", value: 350, enabled: true, company_id: "1" },
  { bid_id: "2", name: "General Liability Insurance", type: "percent", value: 5, enabled: true, company_id: "1" },
  { bid_id: "2", name: "Equipment Wear & Fuel", type: "percent", value: 8, enabled: true, company_id: "1" },
  { bid_id: "3", name: "General Liability Insurance", type: "percent", value: 5, enabled: true, company_id: "1" },
  { bid_id: "3", name: "Equipment Wear & Fuel", type: "percent", value: 8, enabled: true, company_id: "1" },
  { bid_id: "3", name: "Engineering Consultation", type: "dollar", value: 500, enabled: true, company_id: "1" },
];

export const mockMilestones: Omit<Milestone, "id" | "created_date" | "updated_date">[] = [
  { project_id: "1", index: 0, name: "Site Prep & Grading", status: "done", company_id: "1" },
  { project_id: "1", index: 1, name: "Concrete Pour & Stamp", status: "done", company_id: "1" },
  { project_id: "1", index: 2, name: "Pergola Construction", status: "in_progress", notes: "Framing complete, assembly in progress", company_id: "1" },
  { project_id: "1", index: 3, name: "Lighting Installation", status: "not_started", company_id: "1" },
  { project_id: "1", index: 4, name: "Landscaping & Final Cleanup", status: "not_started", company_id: "1" },
  { project_id: "2", index: 0, name: "Sod Removal", status: "done", company_id: "1" },
  { project_id: "2", index: 1, name: "Gravel & Fabric", status: "in_progress", company_id: "1" },
  { project_id: "2", index: 2, name: "Irrigation Install", status: "not_started", company_id: "1" },
  { project_id: "2", index: 3, name: "Planting & Boulder Placement", status: "not_started", company_id: "1" },
  { project_id: "5", index: 0, name: "Soil Prep & Grading", status: "done", company_id: "1" },
  { project_id: "5", index: 1, name: "Sprinkler Installation", status: "done", company_id: "1" },
  { project_id: "5", index: 2, name: "Sod Installation", status: "done", company_id: "1" },
];

export const mockPhotos: Omit<Photo, "id" | "created_date" | "updated_date">[] = [];

export const mockProposals: Omit<Proposal, "id" | "created_date" | "updated_date">[] = [
  { bid_id: "1", sent_at: "2026-02-10T09:00:00.000Z", content: "Proposal for Mitchell backyard renovation including patio, pergola, and lighting.", company_id: "1" },
  { bid_id: "2", sent_at: "2026-02-18T10:00:00.000Z", content: "Proposal for Anderson front yard xeriscape conversion.", company_id: "1" },
  { bid_id: "3", sent_at: "2026-02-25T11:00:00.000Z", content: "Proposal for Garcia retaining wall and terraced garden beds.", company_id: "1" },
];

export const mockProposalThemes: Omit<ProposalTheme, "id" | "created_date" | "updated_date">[] = [
  {
    name: "Green Valley Default",
    brand_color_primary: "#22c55e",
    brand_font_heading: "Inter",
    brand_font_body: "Inter",
    show_line_items: true,
    show_category_subtotals: true,
    show_total_only: false,
    company_id: "1",
  },
  {
    name: "Minimal Clean",
    brand_color_primary: "#1e293b",
    brand_font_heading: "Poppins",
    brand_font_body: "Open Sans",
    show_line_items: false,
    show_category_subtotals: false,
    show_total_only: true,
    company_id: "1",
  },
];

export const mockOverheadTemplates: Omit<OverheadTemplate, "id" | "created_date" | "updated_date">[] = [
  { name: "Standard Overhead", company_id: "1" },
  { name: "Heavy Equipment Job", company_id: "1" },
];

export const mockOverheadTemplateLines: Omit<OverheadTemplateLine, "id" | "created_date" | "updated_date">[] = [
  { overhead_template_id: "1", name: "General Liability Insurance", type: "percent", value: 5, enabled: true, company_id: "1" },
  { overhead_template_id: "1", name: "Equipment Wear & Fuel", type: "percent", value: 8, enabled: true, company_id: "1" },
  { overhead_template_id: "1", name: "Office & Admin", type: "percent", value: 3, enabled: true, company_id: "1" },
  { overhead_template_id: "2", name: "General Liability Insurance", type: "percent", value: 5, enabled: true, company_id: "1" },
  { overhead_template_id: "2", name: "Equipment Wear & Fuel", type: "percent", value: 12, enabled: true, company_id: "1" },
  { overhead_template_id: "2", name: "Equipment Rental", type: "dollar", value: 500, enabled: true, company_id: "1" },
  { overhead_template_id: "2", name: "Office & Admin", type: "percent", value: 3, enabled: true, company_id: "1" },
];

export const mockRoutePlans: Omit<RoutePlan, "id" | "created_date" | "updated_date">[] = [
  {
    name: "Wednesday Maintenance Route - Alpha",
    date: "2026-03-04",
    team_id: "1",
    stops: [
      { id: "rs1", contact_id: "1", address: "742 Maple Dr, Denver, CO 80202", lat: 39.7522, lng: -104.9983, order: 1, arrival_time: "08:00", duration_minutes: 55 },
      { id: "rs2", contact_id: "3", address: "890 Oak Ave, Lakewood, CO 80226", lat: 39.7274, lng: -105.0810, order: 2, arrival_time: "09:30", duration_minutes: 150 },
      { id: "rs3", contact_id: "9", address: "123 Willow St, Denver, CO 80206", lat: 39.7309, lng: -104.9550, order: 3, arrival_time: "13:00", duration_minutes: 45 },
    ],
    optimized: true,
    total_distance_miles: 18.4,
    total_duration_minutes: 280,
    company_id: "1",
  },
  {
    name: "Wednesday Maintenance Route - Bravo",
    date: "2026-03-04",
    team_id: "2",
    stops: [
      { id: "rs4", contact_id: "4", address: "3301 Pine Blvd, Aurora, CO 80010", lat: 39.7294, lng: -104.8319, order: 1, arrival_time: "09:00", duration_minutes: 45 },
      { id: "rs5", contact_id: "2", address: "1205 Elm St, Denver, CO 80203", lat: 39.7327, lng: -104.9837, order: 2, arrival_time: "11:00", duration_minutes: 75 },
    ],
    optimized: true,
    total_distance_miles: 14.2,
    total_duration_minutes: 150,
    company_id: "1",
  },
];

export const mockDoorToDoorPins: Omit<DoorToDoorPin, "id" | "created_date" | "updated_date">[] = [
  { address: "1450 Larimer St, Denver, CO 80202", lat: 39.7480, lng: -104.9994, status: "interested", notes: "Big front yard, mentioned interest in sod replacement", visited_at: "2026-04-28T15:30:00Z", company_id: "1" },
  { address: "2100 Welton St, Denver, CO 80205", lat: 39.7508, lng: -104.9803, status: "made_sale", notes: "Signed up for monthly maintenance plan", visited_at: "2026-04-28T16:15:00Z", company_id: "1" },
  { address: "880 16th St, Denver, CO 80202", lat: 39.7470, lng: -105.0010, status: "follow_up", notes: "Wants quote next week, asked about pavers", visited_at: "2026-04-29T10:00:00Z", company_id: "1" },
  { address: "3201 E Colfax Ave, Denver, CO 80206", lat: 39.7402, lng: -104.9499, status: "no_answer", visited_at: "2026-04-29T14:20:00Z", company_id: "1" },
  { address: "555 17th St, Denver, CO 80202", lat: 39.7461, lng: -104.9892, status: "not_interested", notes: "Has existing landscaper", visited_at: "2026-04-29T11:45:00Z", company_id: "1" },
  { address: "4400 W 29th Ave, Denver, CO 80212", lat: 39.7575, lng: -105.0440, status: "interested", notes: "Considering full backyard renovation", visited_at: "2026-04-29T16:00:00Z", company_id: "1" },
  { address: "990 S Broadway, Denver, CO 80209", lat: 39.7050, lng: -104.9870, status: "do_not_knock", notes: "Owner asked not to be contacted", visited_at: "2026-04-30T09:15:00Z", company_id: "1" },
  { address: "1801 Wynkoop St, Denver, CO 80202", lat: 39.7530, lng: -105.0000, status: "maintenance_customer", notes: "Existing weekly service customer", company_id: "1" },
  { address: "2750 N Speer Blvd, Denver, CO 80211", lat: 39.7670, lng: -105.0220, status: "follow_up", notes: "Out of town until next month, will call", visited_at: "2026-04-30T12:30:00Z", company_id: "1" },
  { address: "1100 S Colorado Blvd, Denver, CO 80246", lat: 39.7050, lng: -104.9410, status: "made_sale", notes: "Spring cleanup + ongoing mow", visited_at: "2026-04-27T13:00:00Z", company_id: "1" },
];

export const mockRolePermissions: Omit<RolePermission, "id" | "created_date" | "updated_date">[] = [
  {
    role: "admin",
    permissions: [
      "contacts:read", "contacts:write", "contacts:delete",
      "projects:read", "projects:write", "projects:delete",
      "bids:read", "bids:write", "bids:delete",
      "payments:read", "payments:write",
      "maintenance:read", "maintenance:write", "maintenance:delete",
      "employees:read", "employees:write", "employees:delete",
      "schedule:read", "schedule:write",
      "settings:read", "settings:write",
      "reports:read",
    ],
    company_id: "1",
  },
  {
    role: "manager",
    permissions: [
      "contacts:read", "contacts:write",
      "projects:read", "projects:write",
      "bids:read", "bids:write",
      "payments:read",
      "maintenance:read", "maintenance:write",
      "employees:read",
      "schedule:read", "schedule:write",
      "reports:read",
    ],
    company_id: "1",
  },
  {
    role: "employee",
    permissions: [
      "contacts:read",
      "projects:read",
      "maintenance:read",
      "schedule:read",
    ],
    company_id: "1",
  },
];

export const mockCompanyMemberships: Omit<CompanyMembership, "id" | "created_date" | "updated_date">[] = [
  { user_id: "user_jake", role: "owner", company_id: "1" },
  { user_id: "user_carlos", role: "admin", company_id: "1" },
  { user_id: "user_ben", role: "admin", company_id: "1" },
];
