import { addDays, addMonths, getDay, isBefore, parseISO, startOfDay } from "date-fns";

export type MaintenanceFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "annually"
  | "custom";

/** Human label for a frequency value. */
export const FREQUENCY_LABELS: Record<MaintenanceFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  custom: "Custom",
};

/** First visit date: the first occurrence of `dayOfWeek` on/after `startDate`
 * for week-based frequencies; otherwise `startDate` itself. */
function firstVisitDate(startISO: string, freq: MaintenanceFrequency, dayOfWeek?: number): Date {
  const start = startOfDay(parseISO(startISO));
  if ((freq === "weekly" || freq === "biweekly" || freq === "custom") && dayOfWeek != null) {
    let d = start;
    // advance to the requested weekday (today counts if it already matches)
    for (let i = 0; i < 7; i++) {
      if (getDay(d) === dayOfWeek) return d;
      d = addDays(d, 1);
    }
  }
  return start;
}

function step(d: Date, freq: MaintenanceFrequency): Date {
  switch (freq) {
    case "weekly":
      return addDays(d, 7);
    case "biweekly":
      return addDays(d, 14);
    case "monthly":
      return addMonths(d, 1);
    case "quarterly":
      return addMonths(d, 3);
    case "annually":
      return addMonths(d, 12);
    case "custom":
    default:
      return addDays(d, 7);
  }
}

/**
 * The next `count` visit dates for a plan, as ISO `yyyy-MM-dd` strings.
 * Stops early if `endISO` (season/plan end) is passed.
 */
export function nextVisitDates(opts: {
  startDate: string;
  frequency: MaintenanceFrequency;
  dayOfWeek?: number;
  count?: number;
  endDate?: string | null;
}): string[] {
  const count = opts.count ?? 8;
  const end = opts.endDate ? startOfDay(parseISO(opts.endDate)) : null;
  let d = firstVisitDate(opts.startDate, opts.frequency, opts.dayOfWeek);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    if (end && isBefore(end, d)) break;
    out.push(toISODate(d));
    d = step(d, opts.frequency);
  }
  return out;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const DAY_OF_WEEK_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
