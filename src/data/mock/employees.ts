import { Employee } from "../types";

export const mockEmployees: Omit<Employee, "id" | "created_date" | "updated_date">[] = [
  { first_name: "Jake", last_name: "Morrison", display_name: "Jake Morrison", email: "jake@greenvalley.com", phone: "303-555-0201", role: "admin", status: "active", hourly_rate: 35, color: "#22c55e", company_id: "1" },
  { first_name: "Carlos", last_name: "Reyes", display_name: "Carlos Reyes", email: "carlos@greenvalley.com", phone: "303-555-0202", role: "manager", status: "active", hourly_rate: 28, color: "#3b82f6", company_id: "1", team_id: "1" },
  { first_name: "Tyler", last_name: "Brooks", display_name: "Tyler Brooks", email: "tyler@greenvalley.com", phone: "303-555-0203", role: "employee", status: "active", hourly_rate: 22, color: "#f59e0b", company_id: "1", team_id: "1" },
  { first_name: "Marcus", last_name: "Johnson", display_name: "Marcus Johnson", email: "marcus@greenvalley.com", phone: "303-555-0204", role: "employee", status: "active", hourly_rate: 22, color: "#ef4444", company_id: "1", team_id: "1" },
  { first_name: "Ben", last_name: "Nguyen", display_name: "Ben Nguyen", email: "ben@greenvalley.com", phone: "303-555-0205", role: "manager", status: "active", hourly_rate: 28, color: "#8b5cf6", company_id: "1", team_id: "2" },
  { first_name: "Alex", last_name: "Foster", display_name: "Alex Foster", email: "alex@greenvalley.com", phone: "303-555-0206", role: "employee", status: "active", hourly_rate: 20, color: "#06b6d4", company_id: "1", team_id: "2" },
  { first_name: "Ryan", last_name: "Cooper", display_name: "Ryan Cooper", email: "ryan@greenvalley.com", phone: "303-555-0207", role: "employee", status: "active", hourly_rate: 20, color: "#ec4899", company_id: "1", team_id: "3" },
  { first_name: "Derek", last_name: "Simmons", display_name: "Derek Simmons", email: "derek@greenvalley.com", phone: "303-555-0208", role: "employee", status: "inactive", hourly_rate: 18, color: "#6b7280", company_id: "1" },
];
