/**
 * Bid ↔ Project Sync Logic
 *
 * Core rule: The PROJECT is the source of truth. The bid is a snapshot
 * whose display status is DERIVED from the linked project's state.
 *
 * Archive operations always cascade in both directions.
 */

import { db } from "@/data/api";
import type { Bid, Project } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Display status derivation                                           */
/* ------------------------------------------------------------------ */

export type BidDisplayStatus =
  | "draft"
  | "sent"
  | "declined"
  | "not_accepted"
  | "accepted_no_date"
  | "accepted"
  | "completed"
  | "archived";

export interface BidDisplayConfig {
  label: string;
  className: string;
}

const DISPLAY_CONFIG: Record<BidDisplayStatus, BidDisplayConfig> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  declined: {
    label: "Declined",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
  not_accepted: {
    label: "Not Accepted Yet",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  },
  accepted_no_date: {
    label: "Accepted - No Date",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  },
  archived: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400",
  },
};

/**
 * Derives the display status of a bid from its linked project.
 * If no project is linked, falls back to the bid's own stored status.
 */
export function deriveBidDisplayStatus(
  bid: Bid,
  projects: Project[]
): BidDisplayStatus {
  // Archived bid always shows archived
  if (bid.archived_at) return "archived";

  // Find linked project (check both directions)
  const project = projects.find(
    (p) => p.bid_id === bid.id || p.id === bid.project_id
  );

  // No linked project — use the bid's own status
  if (!project) {
    if (bid.status === "draft") return "draft";
    if (bid.status === "sent") return "sent";
    if (bid.status === "declined") return "declined";
    return bid.status as BidDisplayStatus;
  }

  // Project is archived → bid shows archived
  if (project.archived_at) return "archived";

  // Project completed
  if (project.is_completed) return "completed";

  // Project has acceptance_state
  if (
    project.acceptance_state === "declined" ||
    bid.status === "declined"
  ) {
    return "declined";
  }

  if (
    project.acceptance_state === "pending" ||
    (!project.acceptance_state && bid.status === "sent")
  ) {
    return "not_accepted";
  }

  // Accepted — check for dates
  if (project.acceptance_state === "accepted" || bid.status === "accepted") {
    if (!project.scheduled_start_date) return "accepted_no_date";
    return "accepted";
  }

  // Fallback
  return bid.status as BidDisplayStatus;
}

/**
 * Get display configuration for a bid display status.
 */
export function getBidDisplayConfig(status: BidDisplayStatus): BidDisplayConfig {
  return DISPLAY_CONFIG[status] || DISPLAY_CONFIG.draft;
}

/* ------------------------------------------------------------------ */
/* Archive / Unarchive with cascade                                    */
/* ------------------------------------------------------------------ */

const timestamp = () => new Date().toISOString();

/**
 * Archive a bid and its linked project (if any).
 */
export async function archiveBidWithProject(
  bid: Bid,
  projects: Project[]
): Promise<{ updatedBid: Bid | null; updatedProject: Project | null }> {
  const updatedBid = await db.Bid.update(bid.id, {
    archived_at: timestamp(),
    status: "declined", // mark as declined when archived
  });

  let updatedProject: Project | null = null;
  const project = projects.find(
    (p) => p.bid_id === bid.id || p.id === bid.project_id
  );
  if (project && !project.archived_at) {
    updatedProject = await db.Project.update(project.id, {
      archived_at: timestamp(),
      status: "archived",
    });
  }

  return { updatedBid, updatedProject };
}

/**
 * Archive a project and its linked bid (if any).
 */
export async function archiveProjectWithBid(
  project: Project,
  bids: Bid[]
): Promise<{ updatedProject: Project | null; updatedBid: Bid | null }> {
  const updatedProject = await db.Project.update(project.id, {
    archived_at: timestamp(),
    status: "archived",
  });

  let updatedBid: Bid | null = null;
  const bid = bids.find(
    (b) => b.id === project.bid_id || b.project_id === project.id
  );
  if (bid && !bid.archived_at) {
    updatedBid = await db.Bid.update(bid.id, {
      archived_at: timestamp(),
    });
  }

  return { updatedProject, updatedBid };
}

/**
 * Unarchive a bid and its linked project (if any).
 */
export async function unarchiveBidWithProject(
  bid: Bid,
  projects: Project[]
): Promise<{ updatedBid: Bid | null; updatedProject: Project | null }> {
  const updatedBid = await db.Bid.update(bid.id, {
    archived_at: null,
    status: bid.accepted_at ? "accepted" : bid.sent_at ? "sent" : "draft",
  });

  let updatedProject: Project | null = null;
  const project = projects.find(
    (p) => p.bid_id === bid.id || p.id === bid.project_id
  );
  if (project?.archived_at) {
    updatedProject = await db.Project.update(project.id, {
      archived_at: null,
      status: project.is_completed
        ? "completed"
        : project.scheduled_start_date
          ? "scheduled"
          : "draft",
    });
  }

  return { updatedBid, updatedProject };
}

/**
 * Unarchive a project and its linked bid (if any).
 */
export async function unarchiveProjectWithBid(
  project: Project,
  bids: Bid[]
): Promise<{ updatedProject: Project | null; updatedBid: Bid | null }> {
  const updatedProject = await db.Project.update(project.id, {
    archived_at: null,
    status: project.is_completed
      ? "completed"
      : project.scheduled_start_date
        ? "scheduled"
        : "draft",
  });

  let updatedBid: Bid | null = null;
  const bid = bids.find(
    (b) => b.id === project.bid_id || b.project_id === project.id
  );
  if (bid?.archived_at) {
    updatedBid = await db.Bid.update(bid.id, {
      archived_at: null,
      status: bid.accepted_at ? "accepted" : bid.sent_at ? "sent" : "draft",
    });
  }

  return { updatedProject, updatedBid };
}

/* ------------------------------------------------------------------ */
/* Delete guard                                                        */
/* ------------------------------------------------------------------ */

/**
 * Returns true if a bid can be safely deleted (no linked project).
 */
export function canDeleteBid(bid: Bid, projects: Project[]): boolean {
  return !projects.some(
    (p) => p.bid_id === bid.id || p.id === bid.project_id
  );
}
