import { ItemsCatalog } from "../types";

export const mockItemsCatalog: Omit<ItemsCatalog, "id" | "created_date" | "updated_date">[] = [
  // Hardscape
  { name: "Concrete Pavers (Standard)", category: "Hardscape", unit: "sq_ft", pricing_strategy: "cost_plus", default_unit_cost: 8, default_sell_price: 14, vendor: "Denver Landscape Supply", sort_order: 1, company_id: "1" },
  { name: "Stamped Concrete", category: "Hardscape", unit: "sq_ft", pricing_strategy: "cost_plus", default_unit_cost: 12, default_sell_price: 18, vendor: "Colorado Concrete Co", sort_order: 2, company_id: "1" },
  { name: "Flagstone (Natural)", category: "Hardscape", unit: "sq_ft", pricing_strategy: "cost_plus", default_unit_cost: 14, default_sell_price: 22, vendor: "Denver Landscape Supply", sort_order: 3, company_id: "1" },
  { name: "Decorative Gravel (3/4 River Rock)", category: "Hardscape", unit: "ton", pricing_strategy: "cost_plus", default_unit_cost: 85, default_sell_price: 130, vendor: "Rocky Mountain Aggregates", sort_order: 4, company_id: "1" },
  { name: "Natural Stone (Moss Rock)", category: "Hardscape", unit: "ton", pricing_strategy: "cost_plus", default_unit_cost: 320, default_sell_price: 480, vendor: "Front Range Stone", sort_order: 5, company_id: "1" },

  // Softscape
  { name: "Sod (Kentucky Bluegrass)", category: "Softscape", unit: "sq_ft", pricing_strategy: "pre_marked", default_unit_cost: 0.60, default_sell_price: 1.00, vendor: "Mile High Turf", sort_order: 6, company_id: "1" },
  { name: "Cedar Mulch", category: "Softscape", unit: "ton", pricing_strategy: "cost_plus", default_unit_cost: 48, default_sell_price: 75, vendor: "Denver Landscape Supply", sort_order: 7, company_id: "1" },
  { name: "Topsoil (Screened)", category: "Softscape", unit: "ton", pricing_strategy: "cost_plus", default_unit_cost: 42, default_sell_price: 65, vendor: "Rocky Mountain Aggregates", sort_order: 8, company_id: "1" },
  { name: "Native Plant (1 gal)", category: "Softscape", unit: "ea", pricing_strategy: "cost_plus", default_unit_cost: 28, default_sell_price: 45, vendor: "High Plains Nursery", sort_order: 9, company_id: "1" },
  { name: "Ornamental Shrub (5 gal)", category: "Softscape", unit: "ea", pricing_strategy: "cost_plus", default_unit_cost: 45, default_sell_price: 75, vendor: "High Plains Nursery", sort_order: 10, company_id: "1" },

  // Irrigation
  { name: "Drip Irrigation System", category: "Irrigation", unit: "sq_ft", pricing_strategy: "cost_plus", default_unit_cost: 1.5, default_sell_price: 2.25, vendor: "Sprinkler Warehouse", sort_order: 11, company_id: "1" },
  { name: "Sprinkler Head (Pop-up)", category: "Irrigation", unit: "ea", pricing_strategy: "cost_plus", default_unit_cost: 12, default_sell_price: 22, vendor: "Sprinkler Warehouse", sort_order: 12, company_id: "1" },
  { name: "Smart Controller (WiFi)", category: "Irrigation", unit: "ea", pricing_strategy: "cost_plus", default_unit_cost: 180, default_sell_price: 320, vendor: "Sprinkler Warehouse", sort_order: 13, company_id: "1" },

  // Lighting
  { name: "LED Path Light", category: "Lighting", unit: "ea", pricing_strategy: "cost_plus", default_unit_cost: 65, default_sell_price: 95, vendor: "Outdoor Lighting Direct", sort_order: 14, company_id: "1" },
  { name: "LED Uplight (Tree/Accent)", category: "Lighting", unit: "ea", pricing_strategy: "cost_plus", default_unit_cost: 120, default_sell_price: 175, vendor: "Outdoor Lighting Direct", sort_order: 15, company_id: "1" },
  { name: "Low Voltage Transformer", category: "Lighting", unit: "ea", pricing_strategy: "cost_plus", default_unit_cost: 280, default_sell_price: 420, vendor: "Outdoor Lighting Direct", sort_order: 16, company_id: "1" },

  // Labor
  { name: "Labor - General", category: "Labor", unit: "hr", pricing_strategy: "cost_plus", default_unit_cost: 25, default_sell_price: 55, vendor: "", sort_order: 17, company_id: "1" },
];
