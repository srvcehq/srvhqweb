import { HardCost } from "../types";

export const mockHardCosts: Omit<HardCost, "id" | "created_date" | "updated_date">[] = [
  { name: "Skid Steer Payment", monthly_cost: 800, category: "equipment", cost_basis: "per_job", is_active: true, notes: "Bobcat S70 lease payment", company_id: "1" },
  { name: "General Liability Insurance", monthly_cost: 450, category: "insurance", cost_basis: "per_job", is_active: true, company_id: "1" },
  { name: "Shop Rent", monthly_cost: 1200, category: "rent", cost_basis: "per_job", is_active: true, notes: "Workshop and storage yard", company_id: "1" },
  { name: "TerraFlow Subscription", monthly_cost: 150, category: "software", cost_basis: "per_job", is_active: true, company_id: "1" },
  { name: "Fuel Budget", monthly_cost: 600, category: "fuel", cost_basis: "per_job", is_active: true, notes: "Estimated monthly fleet fuel", company_id: "1" },
  { name: "F-250 Truck Payment", monthly_cost: 550, category: "vehicle", cost_basis: "per_job", is_active: true, notes: "Work truck lease", company_id: "1" },
  { name: "Trailer Insurance", monthly_cost: 85, category: "insurance", cost_basis: "per_job", is_active: false, notes: "Covered under main policy for now", company_id: "1" },
];
