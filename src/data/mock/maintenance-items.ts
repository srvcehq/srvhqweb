import { MaintenanceItem } from "../types";

export const mockMaintenanceItems: Omit<MaintenanceItem, "id" | "created_date" | "updated_date">[] = [
  { name: "Lawn Mowing", description: "Standard residential lawn mowing, trim, and blow", pricing_type: "flat_rate", price_per_visit: 60, is_active: true, company_id: "1" },
  { name: "Edging", description: "Sidewalk and driveway edging", pricing_type: "flat_rate", price_per_visit: 20, is_active: true, company_id: "1" },
  { name: "Fertilizing", description: "Granular fertilizer application", pricing_type: "per_unit", unit_label: "1,000 sqft", price_per_unit: 15, avg_minutes_per_unit: 5, is_active: true, company_id: "1" },
  { name: "Aeration", description: "Core aeration for soil health", pricing_type: "per_unit", unit_label: "1,000 sqft", price_per_unit: 25, avg_minutes_per_unit: 8, is_active: true, company_id: "1" },
  { name: "Hedge Trimming", description: "Trim and shape hedges and shrubs", pricing_type: "flat_rate", price_per_visit: 50, is_active: true, company_id: "1" },
  { name: "Leaf Cleanup", description: "Seasonal leaf removal and hauling", pricing_type: "variable", suggested_min: 50, suggested_max: 200, is_active: true, company_id: "1" },
  { name: "Snow Removal", description: "Driveway and walkway snow clearing", pricing_type: "variable", suggested_min: 60, suggested_max: 150, is_active: true, company_id: "1" },
  { name: "Gutter Cleaning", description: "Clean and flush gutters and downspouts", pricing_type: "flat_rate", price_per_visit: 120, is_active: true, company_id: "1" },
  { name: "Mulching", description: "Deliver and spread mulch in garden beds", pricing_type: "per_unit", unit_label: "yard", price_per_unit: 40, avg_minutes_per_unit: 15, is_active: true, company_id: "1" },
  { name: "Weed Control", description: "Pre-emergent and spot spray treatment", pricing_type: "flat_rate", price_per_visit: 35, is_active: false, company_id: "1" },
  { name: "Window Cleaning", description: "Exterior window washing", pricing_type: "per_unit", unit_label: "window", price_per_unit: 8, avg_minutes_per_unit: 4, is_active: true, company_id: "1" },
];
