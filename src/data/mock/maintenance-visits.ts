import { MaintenanceVisit } from "../types";

export const mockMaintenanceVisits: Omit<MaintenanceVisit, "id" | "created_date" | "updated_date">[] = [
  // === COMPLETED PAST VISITS ===

  // Plan 1 (Mitchell weekly, Wed) - past weeks
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-02-11", status: "completed", service_performed: "Lawn mowing, edging, weed control", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 55, start_time: "08:00", end_time: "08:55", amountDue: 115, payment_status: "paid" },
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-02-18", status: "completed", service_performed: "Lawn mowing, edging, weed control", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 50, start_time: "08:00", end_time: "08:50", amountDue: 115, payment_status: "paid" },
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-02-25", status: "completed", service_performed: "Lawn mowing, edging, weed control, spot treated dandelions", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 60, start_time: "08:00", end_time: "09:00", amountDue: 115, payment_status: "paid" },

  // Plan 2 (Anderson biweekly, Mon)
  { maintenance_plan_id: "2", contact_id: "2", visit_date: "2026-02-03", status: "completed", service_performed: "Lawn mowing, edging, hedge trimming", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 75, start_time: "09:00", end_time: "10:15", amountDue: 120, payment_status: "paid" },
  { maintenance_plan_id: "2", contact_id: "2", visit_date: "2026-02-17", status: "completed", service_performed: "Lawn mowing, edging, hedge trimming", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 70, start_time: "09:00", end_time: "10:10", amountDue: 120, payment_status: "paid" },

  // Plan 3 (Garcia monthly, Fri)
  { maintenance_plan_id: "3", contact_id: "3", visit_date: "2026-02-06", status: "completed", service_performed: "Full service: mow, edge, hedge trim, mulch, fertilize, weed control", assigned_employee_ids: ["2", "3"], assigned_team_id: "1", duration_minutes: 150, start_time: "07:30", end_time: "10:00", amountDue: 750, payment_status: "paid" },

  // Plan 4 (Chen weekly, Tue) - past weeks
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-02-11", status: "completed", service_performed: "Lawn mowing, edging", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "10:30", end_time: "11:15", amountDue: 80, payment_status: "paid" },
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-02-18", status: "completed", service_performed: "Lawn mowing, edging", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "10:30", end_time: "11:15", amountDue: 80, payment_status: "paid" },
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-02-25", status: "completed", service_performed: "Lawn mowing, edging", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 50, start_time: "10:30", end_time: "11:20", amountDue: 80, payment_status: "paid" },

  // Plan 5 (Thompson biweekly, Thu)
  { maintenance_plan_id: "5", contact_id: "5", visit_date: "2026-02-27", status: "completed", service_performed: "Lawn mowing, edging", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 40, start_time: "13:00", end_time: "13:40", amountDue: 65, payment_status: "paid" },

  // Plan 8 (Davis quarterly) - last visit
  { maintenance_plan_id: "8", contact_id: "8", visit_date: "2026-02-20", status: "completed", service_performed: "Quarterly deep clean: mow, hedge trim, leaf cleanup, gutter clean, mulch refresh", assigned_employee_ids: ["2", "3", "4"], assigned_team_id: "1", duration_minutes: 240, start_time: "07:00", end_time: "11:00", amountDue: 1200, payment_status: "unpaid", notes: "Payment failed, need to follow up" },

  // === OVERDUE VISITS (past date + still scheduled) ===
  { maintenance_plan_id: "2", contact_id: "2", visit_date: "2026-03-02", status: "scheduled", service_performed: undefined, assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 75, start_time: "09:00", end_time: "10:15", amountDue: 120, payment_status: "unpaid", notes: "Rescheduled due to snow - needs to be completed" },
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-03-03", status: "scheduled", service_performed: undefined, assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "10:30", end_time: "11:15", amountDue: 80, payment_status: "unpaid", notes: "Yesterday's visit - crew was on project, needs makeup" },

  // === SKIPPED ===
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-02-04", status: "skipped", notes: "Heavy snow, client agreed to skip", assigned_employee_ids: ["3", "4"], assigned_team_id: "1" },

  // === CANCELLED ===
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-02-04", status: "cancelled", notes: "Client out of town, cancelled this week", assigned_employee_ids: ["5", "6"], assigned_team_id: "2" },

  // === TODAY'S VISITS (2026-03-04, Wednesday) ===
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 55, start_time: "08:00", end_time: "08:55", amountDue: 115, payment_status: "unpaid" },
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "09:00", end_time: "09:45", amountDue: 80, payment_status: "unpaid" },
  { maintenance_plan_id: "3", contact_id: "3", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["2", "3"], assigned_team_id: "1", duration_minutes: 150, start_time: "09:30", end_time: "12:00", amountDue: 750, payment_status: "unpaid", notes: "Monthly full service" },
  { maintenance_plan_id: "5", contact_id: "5", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 40, start_time: "10:00", end_time: "10:40", amountDue: 65, payment_status: "unpaid" },
  { maintenance_plan_id: "2", contact_id: "2", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 75, start_time: "11:00", end_time: "12:15", amountDue: 120, payment_status: "unpaid", notes: "Makeup visit from 3/2 snow delay" },
  { maintenance_plan_id: "1", contact_id: "9", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 45, start_time: "13:00", end_time: "13:45", amountDue: 95, payment_status: "unpaid", notes: "One-off visit, neighbor referral from Mitchell" },
  { maintenance_plan_id: "4", contact_id: "10", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 60, start_time: "14:00", end_time: "15:00", amountDue: 110, payment_status: "unpaid", notes: "New client walkthrough + first mow" },
  { maintenance_plan_id: "6", contact_id: "6", visit_date: "2026-03-04", status: "cancelled", notes: "Plan is paused for winter", assigned_employee_ids: ["3"], assigned_team_id: "1" },

  // === UPCOMING VISITS (rest of this week + next week) ===

  // Thu Mar 5
  { maintenance_plan_id: "5", contact_id: "5", visit_date: "2026-03-05", status: "scheduled", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 40, start_time: "13:00", end_time: "13:40", amountDue: 65, payment_status: "unpaid" },
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-03-05", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "10:30", end_time: "11:15", amountDue: 80, payment_status: "unpaid" },

  // Fri Mar 6
  { maintenance_plan_id: "3", contact_id: "3", visit_date: "2026-03-06", status: "scheduled", assigned_employee_ids: ["2", "3"], assigned_team_id: "1", duration_minutes: 150, start_time: "07:30", end_time: "10:00", amountDue: 750, payment_status: "unpaid", notes: "Check retaining wall area for project prep" },

  // Mon Mar 9
  { maintenance_plan_id: "2", contact_id: "2", visit_date: "2026-03-09", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 75, start_time: "09:00", end_time: "10:15", amountDue: 120, payment_status: "unpaid" },

  // Tue Mar 10
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-03-10", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "10:30", end_time: "11:15", amountDue: 80, payment_status: "unpaid" },

  // Wed Mar 11
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-03-11", status: "scheduled", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 55, start_time: "08:00", end_time: "08:55", amountDue: 115, payment_status: "unpaid" },

  // Thu Mar 12
  { maintenance_plan_id: "5", contact_id: "5", visit_date: "2026-03-12", status: "scheduled", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 40, start_time: "13:00", end_time: "13:40", amountDue: 65, payment_status: "unpaid" },

  // Tue Mar 17
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-03-17", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "10:30", end_time: "11:15", amountDue: 80, payment_status: "unpaid" },

  // Wed Mar 18
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-03-18", status: "scheduled", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 55, start_time: "08:00", end_time: "08:55", amountDue: 115, payment_status: "unpaid" },

  // Mon Mar 23
  { maintenance_plan_id: "2", contact_id: "2", visit_date: "2026-03-23", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 75, start_time: "09:00", end_time: "10:15", amountDue: 120, payment_status: "unpaid" },

  // Tue Mar 24
  { maintenance_plan_id: "4", contact_id: "4", visit_date: "2026-03-24", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 45, start_time: "10:30", end_time: "11:15", amountDue: 80, payment_status: "unpaid" },

  // Wed Mar 25
  { maintenance_plan_id: "1", contact_id: "1", visit_date: "2026-03-25", status: "scheduled", assigned_employee_ids: ["3", "4"], assigned_team_id: "1", duration_minutes: 55, start_time: "08:00", end_time: "08:55", amountDue: 115, payment_status: "unpaid" },

  // === COMMERCIAL VISITS ===

  // Metro Downtown (plan 9, location 1, contact 21) - weekly Mon
  { maintenance_plan_id: "9", contact_id: "21", location_id: "1", visit_date: "2026-02-17", status: "completed", service_performed: "Full grounds: mow, edge, weed control, trash pickup", assigned_employee_ids: ["2", "3", "4"], assigned_team_id: "1", duration_minutes: 120, start_time: "07:00", end_time: "09:00", amountDue: 300, payment_status: "paid" },
  { maintenance_plan_id: "9", contact_id: "21", location_id: "1", visit_date: "2026-02-24", status: "completed", service_performed: "Full grounds: mow, edge, weed control, trash pickup", assigned_employee_ids: ["2", "3", "4"], assigned_team_id: "1", duration_minutes: 110, start_time: "07:00", end_time: "08:50", amountDue: 300, payment_status: "paid" },
  { maintenance_plan_id: "9", contact_id: "21", location_id: "1", visit_date: "2026-03-03", status: "completed", service_performed: "Full grounds: mow, edge, weed control, trash pickup", assigned_employee_ids: ["2", "3", "4"], assigned_team_id: "1", duration_minutes: 115, start_time: "07:00", end_time: "08:55", amountDue: 300, payment_status: "paid" },
  { maintenance_plan_id: "9", contact_id: "21", location_id: "1", visit_date: "2026-03-10", status: "scheduled", assigned_employee_ids: ["2", "3", "4"], assigned_team_id: "1", duration_minutes: 120, start_time: "07:00", end_time: "09:00", amountDue: 300, payment_status: "unpaid" },
  { maintenance_plan_id: "9", contact_id: "21", location_id: "1", visit_date: "2026-03-17", status: "scheduled", assigned_employee_ids: ["2", "3", "4"], assigned_team_id: "1", duration_minutes: 120, start_time: "07:00", end_time: "09:00", amountDue: 300, payment_status: "unpaid" },

  // Metro Lakewood (plan 10, location 2, contact 21) - biweekly Wed
  { maintenance_plan_id: "10", contact_id: "21", location_id: "2", visit_date: "2026-02-19", status: "completed", service_performed: "Mow, edge, hedge trimming", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 90, start_time: "13:00", end_time: "14:30", amountDue: 155, payment_status: "paid" },
  { maintenance_plan_id: "10", contact_id: "21", location_id: "2", visit_date: "2026-03-05", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 90, start_time: "13:00", end_time: "14:30", amountDue: 155, payment_status: "unpaid" },
  { maintenance_plan_id: "10", contact_id: "21", location_id: "2", visit_date: "2026-03-19", status: "scheduled", assigned_employee_ids: ["5", "6"], assigned_team_id: "2", duration_minutes: 90, start_time: "13:00", end_time: "14:30", amountDue: 155, payment_status: "unpaid" },

  // Sunrise Phase 1 (plan 11, location 4, contact 22) - weekly Tue
  { maintenance_plan_id: "11", contact_id: "22", location_id: "4", visit_date: "2026-02-18", status: "completed", service_performed: "Mow, edge, weed control - all 3 pocket parks", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 100, start_time: "08:00", end_time: "09:40", amountDue: 195, payment_status: "paid" },
  { maintenance_plan_id: "11", contact_id: "22", location_id: "4", visit_date: "2026-02-25", status: "completed", service_performed: "Mow, edge, weed control - all 3 pocket parks", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 95, start_time: "08:00", end_time: "09:35", amountDue: 195, payment_status: "paid" },
  { maintenance_plan_id: "11", contact_id: "22", location_id: "4", visit_date: "2026-03-04", status: "scheduled", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 100, start_time: "08:00", end_time: "09:40", amountDue: 195, payment_status: "unpaid" },
  { maintenance_plan_id: "11", contact_id: "22", location_id: "4", visit_date: "2026-03-11", status: "scheduled", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 100, start_time: "08:00", end_time: "09:40", amountDue: 195, payment_status: "unpaid" },
  { maintenance_plan_id: "11", contact_id: "22", location_id: "4", visit_date: "2026-03-18", status: "scheduled", assigned_employee_ids: ["7"], assigned_team_id: "3", duration_minutes: 100, start_time: "08:00", end_time: "09:40", amountDue: 195, payment_status: "unpaid" },
];
