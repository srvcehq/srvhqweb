/**
 * Contact Classification Logic
 *
 * Determines contact type based on a minimal hierarchy:
 * 1. Maintenance Client - has active maintenance plan
 * 2. Project Client - has active/upcoming project
 * 3. Lead - none of the above
 */

import type { Contact, MaintenancePlan, Project } from "@/data/types";

export type ContactType = "maintenance" | "project" | "lead" | "commercial";

export interface ContactTypeDisplay {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Classifies a contact based on their maintenance plans and projects.
 * Returns null for archived contacts.
 */
export function classifyContact(
  contact: Contact | null | undefined,
  maintenancePlans: MaintenancePlan[],
  projects: Project[]
): ContactType | null {
  if (!contact) return "lead";

  // Archived contacts should not be classified
  if (contact.isArchived || contact.archived_at) {
    return null;
  }

  // 0) Commercial: explicitly marked as commercial contact
  if (contact.contact_type === "commercial") {
    return "commercial";
  }

  // 1) Maintenance Client: has at least one active maintenance plan
  const hasActiveMaintenance = maintenancePlans.some(
    (plan) =>
      plan.contact_id === contact.id &&
      plan.status === "active" &&
      !plan.deleted_at
  );

  if (hasActiveMaintenance) return "maintenance";

  // 2) Project Client: has at least one active or upcoming project (NOT archived)
  const hasActiveProject = projects.some(
    (project) =>
      project.contact_id === contact.id &&
      !project.archived_at &&
      (project.acceptance_state === "accepted" || !project.acceptance_state) &&
      !project.is_completed
  );

  if (hasActiveProject) return "project";

  // 3) Lead: none of the above
  return "lead";
}

/**
 * Gets display info for contact type
 */
export function getContactTypeDisplay(type: ContactType | null): ContactTypeDisplay {
  switch (type) {
    case "maintenance":
      return {
        label: "Maintenance Client",
        color: "text-green-700",
        bgColor: "bg-green-100",
        borderColor: "border-green-300",
      };
    case "project":
      return {
        label: "Project Client",
        color: "text-blue-700",
        bgColor: "bg-blue-100",
        borderColor: "border-blue-300",
      };
    case "commercial":
      return {
        label: "Commercial",
        color: "text-purple-700",
        bgColor: "bg-purple-100",
        borderColor: "border-purple-300",
      };
    case "lead":
    default:
      return {
        label: "Lead",
        color: "text-gray-700",
        bgColor: "bg-gray-100",
        borderColor: "border-gray-300",
      };
  }
}
