# Commercial Contacts & Multi-Location Feature — Changelog

Implemented 2026-03-16. Seven phases covering data model, UI, and display updates.

---

## Phase 7: Visit Amount Styling (Quick Win)

**Files modified:**
- `src/app/(app)/schedule/page.tsx`
- `src/app/(app)/route-assignments/page.tsx`

**Changes:**
- Visit `amountDue` now uses conditional styling:
  - `text-gray-400` when visit status is scheduled (greyed out)
  - `text-green-700` when visit status is completed (green)

---

## Phase 1: Data Model Foundation

**Files modified:**
- `src/data/types.ts`
- `src/data/api.ts`
- `src/data/mock/contacts.ts`
- `src/data/mock/maintenance-plans.ts`
- `src/data/mock/maintenance-visits.ts`

**Files created:**
- `src/data/mock/locations.ts`

**Changes:**
- **types.ts**: Added `contact_type?: "residential" | "commercial"` and `company_name?: string` to `Contact` interface. Created new `Location` interface (`contact_id`, `name`, `address_line1/2`, `city`, `state`, `zip`, `latitude`, `longitude`, `notes`, `is_primary`). Added `location_id?: string` to `MaintenancePlan`, `MaintenanceVisit`, `ScheduleBlock`, and `RouteStop`.
- **mock/locations.ts** (NEW): 6 mock locations — 3 for Metro Properties LLC (Downtown Office, Lakewood Business Park, Cherry Creek Retail) and 3 for Sunrise HOA (Phase 1, Phase 2, Clubhouse Grounds).
- **mock/contacts.ts**: Added 2 commercial contacts at end of array: "Greg Hartwell" (Metro Properties LLC, id=21) and "Linda Nakamura" (Sunrise HOA, id=22). Existing contact IDs preserved.
- **mock/maintenance-plans.ts**: Added 3 commercial plans with `location_id`: Metro Downtown Weekly (plan 9), Metro Lakewood Biweekly (plan 10), Sunrise Phase 1 Weekly (plan 11).
- **mock/maintenance-visits.ts**: Added ~15 commercial visits across the 3 commercial plans, with completed and scheduled visits.
- **api.ts**: Added `Location` import and `Location: new MockEntityStore<Location>(...)` to `db` object.

---

## Phase 2: Contact Creation Flow

**Files modified:**
- `src/components/contacts/create-contact-dialog.tsx`
- `src/components/contacts/edit-contact-dialog.tsx`

**Changes:**
- **create-contact-dialog.tsx**: Added two-step creation flow. Step 1: type selection with two cards (Residential with Home icon, Commercial with Building2 icon). Step 2: existing form plus `company_name` field for commercial contacts. `contact_type` and `company_name` included in create payload. Step resets when dialog opens.
- **edit-contact-dialog.tsx**: Added `company_name` to form state. If contact is commercial: shows purple "Commercial" badge with Building2 icon, shows `company_name` input field above first/last name. `company_name` included in update payload.

---

## Phase 3: Contact List Filtering

**Files modified:**
- `src/lib/contact-classification.ts`
- `src/app/(app)/contacts/page.tsx`

**Changes:**
- **contact-classification.ts**: Added `"commercial"` to `ContactType` union. `classifyContact()` now checks `contact.contact_type === "commercial"` before any other checks. `getContactTypeDisplay()` returns purple color scheme for commercial (text-purple-700, bg-purple-100, border-purple-300).
- **contacts/page.tsx**: Added `isCommercial` to `ContactWithStatus` interface. Added `allLocations` query. In categorization, commercial contacts are separated before residential classification (commercial section uses purple color). Added "Commercial Accounts" collapsible section rendered before Maintenance. `isCommercial` and `locationCount` props passed to ContactCard and ContactListItem.

---

## Phase 2b: Contact Card & List Item Display

**Files modified:**
- `src/components/contacts/contact-card.tsx`
- `src/components/contacts/contact-list-item.tsx`

**Changes:**
- Both components: Added `isCommercial?: boolean` and `locationCount?: number` props. Commercial contacts display `company_name` as primary name with contact person name as secondary. Purple avatar gradient (`from-purple-500 to-indigo-600`), purple card border/gradient. Avatar initials from first 2 chars of company name. Location count badge with Building2 icon in purple.

---

## Phase 4: Location Management UI

**Files modified:**
- `src/app/(app)/contacts/[id]/page.tsx` (full rewrite)

**Files created:**
- `src/components/contacts/create-location-dialog.tsx`
- `src/components/contacts/edit-location-dialog.tsx`

**Changes:**
- **contacts/[id]/page.tsx**: Added locations query. For commercial contacts: header shows `company_name` prominently with contact person name underneath and purple Commercial badge. Purple avatar gradient. Purple info card gradient. Commercial banner with location count. Added "Locations" tab (between Projects and Maintenance) with purple active styling. Locations tab shows location cards with name, address, notes, active plan count, primary badge, and edit/delete actions via dropdown. "Add Location" button opens create dialog. Tab grid is 7 columns for commercial, 6 for residential.
- **create-location-dialog.tsx** (NEW): Form with name, address, suite, city/state/zip, notes. Purple gradient submit button. Invalidates locations query on success.
- **edit-location-dialog.tsx** (NEW): Same fields, pre-populated from location prop. Purple gradient submit button.

---

## Phase 5: Location-Specific Maintenance

**Files modified:**
- `src/app/(app)/contacts/[id]/page.tsx` (part of Phase 4 rewrite)
- `src/app/(app)/maintenance-plans/page.tsx`

**Changes:**
- **contacts/[id]/page.tsx — Maintenance tab**: For commercial contacts, plans are grouped by location in collapsible sections. Each location section header shows location name with Building2 icon and active plan count badge. Unassigned plans shown in separate "No Location Assigned" section. Residential contacts keep the flat plan list (unchanged).
- **maintenance-plans/page.tsx**: Added locations query. `getContactName` replaced with `getContactNameForPlan` which uses `getDisplayName()` — shows "Company - Location" for commercial plans. Building2 icon (purple) shown instead of Users icon for commercial plan rows. Search also matches the location-aware display name.

---

## Phase 6: Schedule & Route Display Updates

**Files created:**
- `src/lib/contact-display.ts`

**Files modified:**
- `src/app/(app)/schedule/page.tsx`
- `src/app/(app)/route-assignments/page.tsx`

**Changes:**
- **contact-display.ts** (NEW): `getDisplayName(contact, location?)` returns "Company Name - Location Name" for commercial, "First Last" for residential. `getDisplayAddress(contact, location?)` returns location address when available, otherwise contact address.
- **schedule/page.tsx**: Added locations query. `getContactName` updated to accept optional `locationId` and use `getDisplayName()`. All visit name displays (week grid, day view, today's visits list) now pass `visit.location_id` for location-aware names.
- **route-assignments/page.tsx**: Added locations query. `getContactName` and `getContactAddress` replaced with `getContactNameForVisit` and `getContactAddressForVisit` using the display helpers. Commercial stops show company/location names and location addresses.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/data/mock/locations.ts` | Mock location data (6 locations, 2 commercial contacts) |
| `src/components/contacts/create-location-dialog.tsx` | Add location dialog for commercial contacts |
| `src/components/contacts/edit-location-dialog.tsx` | Edit location dialog |
| `src/lib/contact-display.ts` | Shared display name/address helpers |

## Modified Files Summary

| File | Phase(s) |
|------|----------|
| `src/data/types.ts` | 1 |
| `src/data/api.ts` | 1 |
| `src/data/mock/contacts.ts` | 1 |
| `src/data/mock/maintenance-plans.ts` | 1 |
| `src/data/mock/maintenance-visits.ts` | 1 |
| `src/lib/contact-classification.ts` | 3 |
| `src/components/contacts/create-contact-dialog.tsx` | 2 |
| `src/components/contacts/edit-contact-dialog.tsx` | 2 |
| `src/components/contacts/contact-card.tsx` | 2b |
| `src/components/contacts/contact-list-item.tsx` | 2b |
| `src/app/(app)/contacts/page.tsx` | 3 |
| `src/app/(app)/contacts/[id]/page.tsx` | 4, 5 |
| `src/app/(app)/schedule/page.tsx` | 6, 7 |
| `src/app/(app)/route-assignments/page.tsx` | 6, 7 |
| `src/app/(app)/maintenance-plans/page.tsx` | 5 |

## Design Decisions

- Existing contacts with no `contact_type` are treated as `"residential"` everywhere
- Commercial contacts use purple/indigo color scheme consistently
- Commercial classification takes priority over maintenance/project/lead
- `company_name` is the primary display name for commercial; contact person name is secondary
- Location dialogs use purple gradient buttons to match commercial theming
- All changes are on the mock data layer — no backend required
