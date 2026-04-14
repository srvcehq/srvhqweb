/**
 * Shared date and currency formatting helpers.
 * Consolidates duplicate functions across pages.
 */

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

/** Format a Date as yyyy-MM-dd (local, no timezone shift). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's date as yyyy-MM-dd. */
export function todayStr(): string {
  return isoDate(new Date());
}

/** Return a new Date offset by n days. */
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Return the Sunday that starts the week containing d. */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Return the first day of the month containing d. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Shift a yyyy-MM-dd string by n days. Returns a new yyyy-MM-dd string. */
export function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

/** Convert "HH:mm" (24h) to "h:mm AM/PM". Returns "" for falsy input. */
export function formatTime12(time24?: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const ap = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ap}`;
}

/* ------------------------------------------------------------------ */
/* Date display helpers                                                */
/* ------------------------------------------------------------------ */

/** Format a yyyy-MM-dd string as "Mon DD, YYYY" or similar short date. */
export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "\u2014";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a yyyy-MM-dd string as "Mon DD" (no year). */
export function formatShortDateNoYear(dateStr?: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Human-friendly date label: "Today", "Mon, Mar 5", etc. */
export function formatDateLabel(dateStr: string): string {
  if (dateStr === todayStr()) return "Today";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Currency helper                                                     */
/* ------------------------------------------------------------------ */

/** Format a number as "$1,234.56". */
export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
