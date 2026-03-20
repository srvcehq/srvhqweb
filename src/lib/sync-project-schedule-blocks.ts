/**
 * Synchronizes ScheduleBlock entries for a project.
 *
 * Creates/updates blocks based on project dates, assignments, and work days.
 * Idempotent: safe to call multiple times without creating duplicates.
 */

import { db } from "@/data/api";
import { eachDayOfInterval, format } from "date-fns";

/**
 * Parse a date-only string (yyyy-MM-dd) as a local date without timezone
 * conversion. Prevents off-by-one errors when date strings are treated as
 * UTC midnight.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const DAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface SyncProjectScheduleBlocksParams {
  projectId: string;
  startDate: string;
  endDate: string;
  assignedEmployeeIds?: string[];
  assignedTeamIds?: string[];
  selectedWorkDays?: string[];
}

export async function syncProjectScheduleBlocks({
  projectId,
  startDate,
  endDate,
  assignedEmployeeIds = [],
  assignedTeamIds = [],
  selectedWorkDays = ["Mon", "Tue", "Wed", "Thu", "Fri"],
}: SyncProjectScheduleBlocksParams): Promise<void> {
  if (!projectId || !startDate || !endDate) {
    console.warn("[syncProjectScheduleBlocks] Missing required parameters");
    return;
  }

  // Fetch existing blocks for this project
  const allBlocks = await db.ScheduleBlock.filter({
    project_id: projectId,
    block_type: "project",
  });

  // Generate expected working dates -- parse as local dates to prevent timezone shift
  const allDates = eachDayOfInterval({
    start: parseLocalDate(startDate),
    end: parseLocalDate(endDate),
  });

  const selectedDayIndices = selectedWorkDays.map((day) => DAY_MAP[day]);

  const workingDates = allDates.filter((date) => {
    const dayOfWeek = date.getDay();
    return selectedDayIndices.includes(dayOfWeek);
  });

  if (workingDates.length === 0) {
    console.warn("[syncProjectScheduleBlocks] No working days in date range");
    return;
  }

  const expectedDateStrs = workingDates.map((date) => format(date, "yyyy-MM-dd"));
  const existingDateStrs = new Set(allBlocks.map((b) => b.start_date));

  // Determine assignment info (use first team or first employee)
  let assignedTeamId: string | undefined;
  let assignedEmployeeIdsVal: string[] | undefined;

  if (assignedTeamIds.length > 0) {
    assignedTeamId = assignedTeamIds[0];
  }
  if (assignedEmployeeIds.length > 0) {
    assignedEmployeeIdsVal = assignedEmployeeIds;
  }

  // Find missing dates and create blocks
  const missingDates = expectedDateStrs.filter(
    (dateStr) => !existingDateStrs.has(dateStr)
  );

  for (const dateStr of missingDates) {
    await db.ScheduleBlock.create({
      project_id: projectId,
      title: "Project Work",
      start_date: dateStr,
      end_date: dateStr,
      block_type: "project",
      all_day: true,
      assigned_team_id: assignedTeamId,
      assigned_employee_ids: assignedEmployeeIdsVal,
    });
  }

  // Delete blocks outside the new date range
  const blocksToDelete = allBlocks.filter(
    (block) => !expectedDateStrs.includes(block.start_date)
  );

  for (const block of blocksToDelete) {
    await db.ScheduleBlock.delete(block.id);
  }

  console.log(
    `[syncProjectScheduleBlocks] Created ${missingDates.length} new blocks, deleted ${blocksToDelete.length} outdated blocks`
  );
}
