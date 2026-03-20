import { HardCost } from "../types";

export const mockHardCosts: Omit<HardCost, "id" | "created_date" | "updated_date">[] = [
  { name: "Concrete Mix (80lb bag)", category: "Materials", cost: 6.50, unit: "bag", vendor: "Home Depot", notes: "For small pours and post setting", company_id: "1" },
  { name: "Cedar Lumber (2x6x12)", category: "Materials", cost: 14.80, unit: "board", vendor: "Lumber Yard Plus", notes: "Pergola and deck framing", company_id: "1" },
  { name: "River Rock (3/4 inch)", category: "Materials", cost: 85.00, unit: "ton", vendor: "Rocky Mountain Aggregates", notes: "Xeriscape and decorative ground cover", company_id: "1" },
  { name: "Drip Tubing (100ft roll)", category: "Materials", cost: 22.50, unit: "roll", vendor: "Sprinkler Warehouse", notes: "1/2 inch mainline drip tubing", company_id: "1" },
  { name: "LED Path Light Fixture", category: "Materials", cost: 65.00, unit: "ea", vendor: "Outdoor Lighting Direct", notes: "Brass, 3W warm white", company_id: "1" },
  { name: "Sod Pallet (Kentucky Bluegrass)", category: "Materials", cost: 225.00, unit: "pallet", vendor: "Mile High Turf", notes: "Approx 500 sq ft per pallet", company_id: "1" },
  { name: "Bobcat Rental (Daily)", category: "Equipment", cost: 350.00, unit: "day", vendor: "United Rentals", notes: "S70 skid steer, includes delivery/pickup", company_id: "1" },
  { name: "Plate Compactor Rental", category: "Equipment", cost: 85.00, unit: "day", vendor: "Sunbelt Rentals", notes: "For paver and gravel base compaction", company_id: "1" },
  { name: "Dump Trailer Load (Disposal)", category: "Equipment", cost: 175.00, unit: "load", vendor: "Denver Waste Services", notes: "Dirt, sod, and green waste disposal", company_id: "1" },
  { name: "Topsoil (Screened)", category: "Materials", cost: 42.00, unit: "ton", vendor: "Rocky Mountain Aggregates", notes: "For garden beds and grading", company_id: "1" },
];
