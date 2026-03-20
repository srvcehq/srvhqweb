import { BidLineItem } from "../types";

export const mockBidLineItems: Omit<BidLineItem, "id" | "created_date" | "updated_date">[] = [
  // Bid 1 - Mitchell Backyard Patio & Pergola
  { bid_id: "1", item_name: "Stamped Concrete Patio", category: "Hardscape", unit: "sq_ft", qty: 450, unit_cost: 12, sell_price: 18, sort_order: 1 },
  { bid_id: "1", item_name: "Cedar Pergola (12x14)", category: "Hardscape", unit: "ea", qty: 1, unit_cost: 3200, sell_price: 4800, sort_order: 2 },
  { bid_id: "1", item_name: "Built-In Bench Seating", category: "Hardscape", unit: "ea", qty: 2, unit_cost: 850, sell_price: 1275, sort_order: 3 },
  { bid_id: "1", item_name: "LED Path Lights", category: "Lighting", unit: "ea", qty: 12, unit_cost: 65, sell_price: 95, sort_order: 4 },
  { bid_id: "1", item_name: "LED Uplights (Tree)", category: "Lighting", unit: "ea", qty: 4, unit_cost: 120, sell_price: 175, sort_order: 5 },
  { bid_id: "1", item_name: "Low Voltage Transformer", category: "Lighting", unit: "ea", qty: 1, unit_cost: 280, sell_price: 420, sort_order: 6 },
  { bid_id: "1", item_name: "Ornamental Shrubs", category: "Softscape", unit: "ea", qty: 8, unit_cost: 45, sell_price: 75, sort_order: 7 },

  // Bid 2 - Anderson Xeriscape
  { bid_id: "2", item_name: "Sod Removal & Disposal", category: "Softscape", unit: "sq_ft", qty: 1200, unit_cost: 0.75, sell_price: 1.25, sort_order: 1 },
  { bid_id: "2", item_name: "Decorative Gravel (3/4 River Rock)", category: "Hardscape", unit: "ton", qty: 8, unit_cost: 85, sell_price: 130, sort_order: 2 },
  { bid_id: "2", item_name: "Native Plant Package", category: "Softscape", unit: "ea", qty: 35, unit_cost: 28, sell_price: 45, sort_order: 3 },
  { bid_id: "2", item_name: "Drip Irrigation System", category: "Irrigation", unit: "sq_ft", qty: 1200, unit_cost: 1.5, sell_price: 2.25, sort_order: 4 },
  { bid_id: "2", item_name: "Landscape Fabric", category: "Softscape", unit: "sq_ft", qty: 1200, unit_cost: 0.35, sell_price: 0.55, sort_order: 5 },
  { bid_id: "2", item_name: "Boulder Accents", category: "Hardscape", unit: "ea", qty: 5, unit_cost: 180, sell_price: 275, sort_order: 6 },

  // Bid 3 - Garcia Retaining Wall
  { bid_id: "3", item_name: "Natural Stone (Moss Rock)", category: "Hardscape", unit: "ton", qty: 12, unit_cost: 320, sell_price: 480, sort_order: 1 },
  { bid_id: "3", item_name: "Wall Foundation & Drainage", category: "Hardscape", unit: "sq_ft", qty: 120, unit_cost: 8, sell_price: 14, sort_order: 2 },
  { bid_id: "3", item_name: "Topsoil for Beds", category: "Softscape", unit: "ton", qty: 6, unit_cost: 42, sell_price: 65, sort_order: 3 },
  { bid_id: "3", item_name: "Perennial Plantings", category: "Softscape", unit: "ea", qty: 48, unit_cost: 18, sell_price: 32, sort_order: 4 },
  { bid_id: "3", item_name: "Drip Line (Garden Beds)", category: "Irrigation", unit: "sq_ft", qty: 300, unit_cost: 1.75, sell_price: 2.75, sort_order: 5 },

  // Bid 4 - Thompson Phase 2 (sent)
  { bid_id: "4", item_name: "Perennial Flower Mix", category: "Softscape", unit: "ea", qty: 60, unit_cost: 12, sell_price: 22, sort_order: 1 },
  { bid_id: "4", item_name: "Ornamental Grasses", category: "Softscape", unit: "ea", qty: 15, unit_cost: 35, sell_price: 55, sort_order: 2 },
  { bid_id: "4", item_name: "Cedar Mulch", category: "Softscape", unit: "ton", qty: 3, unit_cost: 48, sell_price: 75, sort_order: 3 },

  // Bid 5 - Martinez Courtyard (sent)
  { bid_id: "5", item_name: "Flagstone Pavers", category: "Hardscape", unit: "sq_ft", qty: 200, unit_cost: 14, sell_price: 22, sort_order: 1 },
  { bid_id: "5", item_name: "Garden Fountain (Tier)", category: "Hardscape", unit: "ea", qty: 1, unit_cost: 1200, sell_price: 1800, sort_order: 2 },
  { bid_id: "5", item_name: "Climbing Vine Trellis", category: "Softscape", unit: "ea", qty: 3, unit_cost: 85, sell_price: 140, sort_order: 3 },
  { bid_id: "5", item_name: "LED String Lights", category: "Lighting", unit: "ea", qty: 4, unit_cost: 45, sell_price: 75, sort_order: 4 },

  // Bid 6 - Taylor Draft
  { bid_id: "6", item_name: "Privacy Fence (Cedar, 6ft)", category: "Hardscape", unit: "sq_ft", qty: 320, unit_cost: 18, sell_price: 28, sort_order: 1 },
  { bid_id: "6", item_name: "Artificial Turf", category: "Softscape", unit: "sq_ft", qty: 600, unit_cost: 6, sell_price: 10, sort_order: 2 },
  { bid_id: "6", item_name: "Concrete Pavers (Patio)", category: "Hardscape", unit: "sq_ft", qty: 300, unit_cost: 10, sell_price: 16, sort_order: 3 },
];
