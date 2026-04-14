import type { Contact, Employee, Location } from "@/data/types";

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
 * Finds a contact by ID and returns "First Last". Useful for lookup-by-ID patterns
 * that don't need commercial/location-aware display names.
 */
export function findContactName(
  contacts: Contact[],
  contactId: string | undefined
): string {
  if (!contactId) return "Unknown";
  const contact = contacts.find((c) => c.id === contactId);
  return contact ? `${contact.first_name} ${contact.last_name}` : "Unknown";
}

/**
 * Finds an employee by ID and returns their display name or "First Last".
 */
export function findEmployeeName(
  employees: Employee[],
  employeeId: string
): string {
  const employee = employees.find((e) => e.id === employeeId);
  return employee
    ? employee.display_name || `${employee.first_name} ${employee.last_name}`
    : "Unknown";
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
