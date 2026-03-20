/**
 * Shared project status helpers
 *
 * Single source of truth for project lifecycle state mapping,
 * labeling, and badge colors. Used by both Projects page and Contact Detail.
 */

import type { Project, Bid } from "@/data/types";

export type LifecycleState =
  | "not_accepted"
  | "accepted_no_date"
  | "upcoming"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "archived";

export interface CategorizedProjects {
  accepted: Project[];
  waiting: Project[];
  completed: Project[];
  archived: Project[];
}

/**
 * Get the lifecycle state of a project based on its bid status and dates.
 */
export function getLifecycleState(
  project: Project,
  allBids: Bid[] = []
): LifecycleState {
  // If archived, always return archived
  if (project.archived === true) {
    return "archived";
  }

  // Get the related bid
  const relatedBid = allBids.find((b) => b.id === project.bid_id);

  // Use bid status as source of truth for acceptance state
  const bidStatus = relatedBid?.status || "sent";

  // If bid is not accepted, project is not accepted
  if (bidStatus === "sent" || bidStatus === "draft" || bidStatus === "declined") {
    return "not_accepted";
  }

  // For accepted bids, derive lifecycle from dates
  if (!project.scheduled_start_date) {
    return "accepted_no_date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(project.scheduled_start_date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = project.scheduled_end_date
    ? new Date(project.scheduled_end_date)
    : null;
  if (endDate) endDate.setHours(0, 0, 0, 0);

  if (startDate > today) return "upcoming";
  if (endDate && endDate < today) return "completed";
  return "in_progress";
}

/**
 * Get display label for a project's lifecycle state.
 */
export function getLifecycleLabel(lifecycleState: LifecycleState): string {
  const labels: Record<LifecycleState, string> = {
    not_accepted: "Not Accepted Yet",
    accepted_no_date: "Accepted - No Date",
    upcoming: "Upcoming",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived",
  };
  return labels[lifecycleState] || lifecycleState;
}

/**
 * Get Tailwind color classes for a lifecycle state badge.
 */
export function getLifecycleColor(lifecycleState: LifecycleState): string {
  const colors: Record<LifecycleState, string> = {
    not_accepted: "bg-gray-100 text-gray-700 border-gray-200",
    accepted_no_date: "bg-amber-100 text-amber-700 border-amber-200",
    upcoming: "bg-blue-100 text-blue-700 border-blue-200",
    in_progress: "bg-green-100 text-green-700 border-green-200",
    completed: "bg-purple-100 text-purple-700 border-purple-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    archived: "bg-gray-100 text-gray-600 border-gray-300",
  };
  return colors[lifecycleState] || "bg-gray-100 text-gray-700 border-gray-200";
}

/**
 * Categorize projects into 4 sections: Accepted, Waiting, Completed, Archived.
 */
export function categorizeProjectsBySection(
  projects: Project[],
  allBids: Bid[] = []
): CategorizedProjects {
  const accepted: Project[] = [];
  const waiting: Project[] = [];
  const completed: Project[] = [];
  const archived: Project[] = [];

  projects.forEach((project) => {
    // Archived projects always go to archived section
    if (project.archived === true) {
      archived.push(project);
      return;
    }

    // Completed projects go to completed section
    if (project.is_completed === true) {
      completed.push(project);
      return;
    }

    // Get related bid for status
    const relatedBid = allBids.find((b) => b.id === project.bid_id);
    const bidStatus = relatedBid?.status;

    // Accepted statuses
    const acceptedStatuses = [
      "accepted",
      "accepted_no_date",
      "accepted_with_date",
      "in_progress",
      "scheduled",
      "completed",
    ];

    // Waiting statuses
    const waitingStatuses = ["sent", "awaiting_response", "pending"];

    if (bidStatus && acceptedStatuses.includes(bidStatus)) {
      accepted.push(project);
    } else if (bidStatus && waitingStatuses.includes(bidStatus)) {
      waiting.push(project);
    }
    // If bid status doesn't match either, don't include (e.g., draft, declined)
  });

  return { accepted, waiting, completed, archived };
}
