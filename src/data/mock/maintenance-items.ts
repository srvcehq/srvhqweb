import { MaintenanceItem } from "../types";

export const mockMaintenanceItems: Omit<MaintenanceItem, "id" | "created_date" | "updated_date">[] = [
  { name: "Lawn Mowing", description: "Standard lawn mowing with bagging or mulching", default_price: 60, category: "Lawn Care", unit: "per visit", company_id: "1" },
  { name: "Edging", description: "Clean edging along sidewalks, driveways, and garden beds", default_price: 20, category: "Lawn Care", unit: "per visit", company_id: "1" },
  { name: "Hedge Trimming", description: "Shape and trim hedges, shrubs, and ornamental bushes", default_price: 50, category: "Pruning", unit: "per visit", company_id: "1" },
  { name: "Leaf Cleanup", description: "Blow, rake, and bag fallen leaves from lawn and beds", default_price: 85, category: "Seasonal", unit: "per visit", company_id: "1" },
  { name: "Mulching", description: "Spread fresh mulch in garden beds (mulch material extra)", default_price: 120, category: "Beds & Gardens", unit: "per visit", company_id: "1" },
  { name: "Weed Control", description: "Manual weed removal and pre-emergent application in beds", default_price: 35, category: "Beds & Gardens", unit: "per visit", company_id: "1" },
  { name: "Fertilizing", description: "Lawn fertilizer application, seasonal blend", default_price: 75, category: "Lawn Care", unit: "per application", company_id: "1" },
  { name: "Aeration", description: "Core aeration to reduce soil compaction and promote root growth", default_price: 250, category: "Lawn Care", unit: "per service", company_id: "1" },
  { name: "Snow Removal", description: "Driveway and walkway snow clearing (salt/deicer extra)", default_price: 95, category: "Seasonal", unit: "per visit", company_id: "1" },
  { name: "Gutter Cleaning", description: "Clear gutters and downspouts of debris", default_price: 120, category: "Seasonal", unit: "per service", company_id: "1" },
];
