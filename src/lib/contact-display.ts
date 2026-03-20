import type { Contact, Location } from "@/data/types";

/**
 * Returns the display name for a contact, accounting for commercial contacts with locations.
 * Commercial: "Company Name - Location Name" or just "Company Name"
 * Residential: "First Last"
 */
export function getDisplayName(
  contact: Contact | undefined | null,
  location?: Location | undefined | null
): string {
  if (!contact) return "Unknown";

  if (contact.contact_type === "commercial" && contact.company_name) {
    if (location) {
      return `${contact.company_name} - ${location.name}`;
    }
    return contact.company_name;
  }

  return `${contact.first_name} ${contact.last_name}`;
}

/**
 * Returns the display address for a contact, using location address for commercial contacts
 * when a location_id is provided, otherwise falling back to the contact's address.
 */
export function getDisplayAddress(
  contact: Contact | undefined | null,
  location?: Location | undefined | null
): string | null {
  if (location) {
    return [location.address_line1, location.city, location.state, location.zip]
      .filter(Boolean)
      .join(", ");
  }

  if (!contact) return null;
  const parts = [contact.address_line1, contact.city, contact.state, contact.zip].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
