/**
 * Centralized React Query key factory.
 *
 * Using a single source for query keys ensures cache sharing across pages.
 * When page A fetches contacts and page B also needs contacts, they hit
 * the same cache entry instead of making separate requests.
 */

export const queryKeys = {
  contacts: (companyId: string) => ["contacts", companyId] as const,
  employees: () => ["employees"] as const,
  teams: () => ["teams"] as const,
  locations: (companyId: string) => ["locations", companyId] as const,
  bids: (companyId: string) => ["bids", companyId] as const,
  projects: (companyId: string) => ["projects", companyId] as const,
  payments: (companyId: string) => ["payments", companyId] as const,
  maintenanceVisits: (companyId: string) =>
    ["maintenance-visits", companyId] as const,
  maintenancePlans: (companyId: string) =>
    ["maintenance-plans", companyId] as const,
  maintenanceItems: (companyId: string) =>
    ["maintenance-items", companyId] as const,
  scheduleBlocks: (companyId: string) =>
    ["schedule-blocks", companyId] as const,
  hardCosts: (companyId: string) => ["hard-costs", companyId] as const,
  communications: (companyId: string) =>
    ["communications", companyId] as const,
};
