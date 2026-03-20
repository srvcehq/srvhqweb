"use client";

import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import type { Employee, Team, MaintenanceVisit } from "@/data/types";

// ---------------------------------------------------------------------------
// Hook: fetch all employees
// ---------------------------------------------------------------------------

/**
 * Hook that fetches all employees via the mock data layer.
 * Cached for 5 minutes.
 */
export function useEmployees() {
  return useQuery({
    queryKey: ["employees-all"],
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Pure helper functions
// ---------------------------------------------------------------------------

/**
 * Get display name for an employee.
 * Falls back to "first_name last_name" when display_name is not set.
 */
export function getEmployeeDisplayName(employee: Employee | null | undefined): string {
  if (!employee) return "Unknown";
  return employee.display_name || `${employee.first_name} ${employee.last_name}`;
}

export interface FormatCrewOptions {
  maxDisplay?: number;
  showMore?: boolean;
}

/**
 * Format assigned employee IDs into a display string.
 *
 * @param employeeIds - Array of employee ID strings
 * @param employees   - Full list of employees to resolve IDs against
 * @param options     - { maxDisplay, showMore }
 */
export function formatAssignedCrew(
  employeeIds: string[] | null | undefined,
  employees: Employee[],
  options: FormatCrewOptions = {}
): string {
  const { maxDisplay = 3, showMore = true } = options;

  if (!employeeIds || employeeIds.length === 0) {
    return "Unassigned";
  }

  if (!employees || employees.length === 0) {
    return "Loading...";
  }

  const assignedEmployees = employeeIds
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as Employee[];

  if (assignedEmployees.length === 0) {
    return "Unassigned";
  }

  const displayNames = assignedEmployees
    .slice(0, maxDisplay)
    .map((e) => getEmployeeDisplayName(e));
  const remaining = assignedEmployees.length - maxDisplay;

  if (remaining > 0 && showMore) {
    return `${displayNames.join(", ")} +${remaining} more`;
  }

  return displayNames.join(", ");
}

/**
 * Short version for calendar blocks (first names only).
 * Returns null when nothing to display.
 */
export function formatAssignedCrewShort(
  employeeIds: string[] | null | undefined,
  employees: Employee[],
  options: FormatCrewOptions = {}
): string | null {
  const { maxDisplay = 2, showMore = true } = options;

  if (!employeeIds || employeeIds.length === 0) {
    return null;
  }

  if (!employees || employees.length === 0) {
    return null;
  }

  const assignedEmployees = employeeIds
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as Employee[];

  if (assignedEmployees.length === 0) {
    return null;
  }

  const firstNames = assignedEmployees.slice(0, maxDisplay).map((e) => e.first_name);
  const remaining = assignedEmployees.length - maxDisplay;

  if (remaining > 0 && showMore) {
    return `${firstNames.join(", ")} +${remaining}`;
  }

  return firstNames.join(", ");
}

/**
 * Format crew from visit data -- teams first, then employees.
 * Returns null when nothing to display.
 */
export function formatVisitCrew(
  visit: MaintenanceVisit | null | undefined,
  employees: Employee[],
  teams: Team[]
): string | null {
  if (!visit) return null;

  const teamIds: string[] = visit.assigned_team_id ? [visit.assigned_team_id] : [];
  const employeeIds: string[] = visit.assigned_employee_ids || [];

  // If teams are assigned, show teams first
  if (teamIds.length > 0 && teams && teams.length > 0) {
    const assignedTeams = teamIds
      .map((id) => teams.find((t) => t.id === id))
      .filter(Boolean) as Team[];

    if (assignedTeams.length > 0) {
      const firstName = assignedTeams[0].name;
      const remaining = assignedTeams.length - 1;
      return remaining > 0 ? `${firstName} +${remaining}` : firstName;
    }
  }

  // Fall back to employees
  if (employeeIds.length > 0 && employees && employees.length > 0) {
    const assignedEmployees = employeeIds
      .map((id) => employees.find((e) => e.id === id))
      .filter(Boolean) as Employee[];

    if (assignedEmployees.length > 0) {
      const firstName = assignedEmployees[0].first_name;
      const remaining = assignedEmployees.length - 1;
      return remaining > 0 ? `${firstName} +${remaining}` : firstName;
    }
  }

  return null;
}
