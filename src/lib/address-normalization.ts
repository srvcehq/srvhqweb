/**
 * Address normalization utilities
 *
 * Normalizes street addresses by expanding common abbreviations:
 * - Directionals: N/S/E/W -> North/South/East/West, NE/NW/SE/SW -> Northeast/etc.
 * - Street suffixes: st->Street, rd->Road, cir->Circle, etc.
 *
 * Uses word boundaries to avoid replacing substrings
 * (e.g., "Stacey" won't become "Streetacey").
 */

/** Directional abbreviation mappings (case-insensitive, whole word) */
const DIRECTIONALS: Record<string, string> = {
  n: "North",
  s: "South",
  e: "East",
  w: "West",
  ne: "Northeast",
  nw: "Northwest",
  se: "Southeast",
  sw: "Southwest",
};

/** Street suffix abbreviation mappings (case-insensitive, whole word) */
const SUFFIXES: Record<string, string> = {
  st: "Street",
  rd: "Road",
  dr: "Drive",
  ave: "Avenue",
  blvd: "Boulevard",
  cir: "Circle",
  ct: "Court",
  ln: "Lane",
  pl: "Place",
  pkwy: "Parkway",
  hwy: "Highway",
  way: "Way",
  ter: "Terrace",
  trl: "Trail",
  sq: "Square",
  apt: "Apt",
  ste: "Suite",
  unit: "Unit",
};

/**
 * Normalizes a street address by expanding abbreviations and applying title case.
 *
 * @param input - Raw street address string
 * @returns Normalized address or the original value if input is empty/invalid
 */
export function normalizeStreetAddress(input: string | null | undefined): string | null | undefined {
  if (!input || typeof input !== "string") return input;

  let normalized = input.trim();
  if (!normalized) return normalized;

  // Replace directionals (whole word boundaries)
  Object.entries(DIRECTIONALS).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, "gi");
    normalized = normalized.replace(regex, full);
  });

  // Replace street suffixes (whole word boundaries)
  Object.entries(SUFFIXES).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, "gi");
    normalized = normalized.replace(regex, full);
  });

  // Title case each word while preserving numbers and special formatting
  normalized = normalized
    .split(/\s+/)
    .map((word) => {
      // Skip empty strings
      if (!word) return word;

      // Preserve all-caps abbreviations that are already normalized (like "Apt")
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }

      // Preserve numbers
      if (/^\d+$/.test(word)) return word;

      // Preserve special chars like "#12"
      if (/^[#]/.test(word)) return word;

      // Title case: first letter uppercase, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");

  return normalized;
}
