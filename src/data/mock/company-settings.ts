import { CompanySetting } from "../types";

export const mockCompanySettings: Omit<CompanySetting, "id" | "created_date" | "updated_date">[] = [
  {
    company_name: "Green Valley Landscaping",
    logo_url: undefined,
    crews_total: 3,
    crew_size_per_team: 3,
    stripe_connect_account_id: "acct_1PaBCgreenvalley",
    stripe_connect_status: "active",
    default_hourly_wage: 25,
    default_hours_per_day: 8,
    labor_cost_mode: "overhead",
    company_id: "1",
  },
];
