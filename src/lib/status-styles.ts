/**
 * Shared status badge class strings used across dashboard, bids, contacts, etc.
 * Each key maps a semantic status to its light + dark mode Tailwind classes.
 */

export const STATUS_BADGE = {
  green:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
  blue:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40",
  amber:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40",
  yellow:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40",
  red:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40",
  gray:
    "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700",
  purple:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/40",
  orange:
    "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/40",
} as const;

/** Section-level color classes used in contacts page sections */
export const SECTION_COLORS = {
  badge: {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  border: {
    green: "border-green-200 dark:border-green-800/40",
    blue: "border-blue-200 dark:border-blue-800/40",
    amber: "border-amber-200 dark:border-amber-800/40",
    gray: "border-gray-200 dark:border-gray-700",
    purple: "border-purple-200 dark:border-purple-800/40",
  },
  bg: {
    green: "bg-green-50/50 dark:bg-green-950/20",
    blue: "bg-blue-50/50 dark:bg-blue-950/20",
    amber: "bg-amber-50/50 dark:bg-amber-950/20",
    gray: "bg-gray-50/50 dark:bg-gray-900/30",
    purple: "bg-purple-50/50 dark:bg-purple-950/20",
  },
} as const;

export type SectionColor = keyof typeof SECTION_COLORS.badge;
