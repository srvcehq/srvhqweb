/**
 * One-shot seed endpoint — loads all mock data from src/data/mock/*.ts into
 * Supabase, remapping mock string IDs ("1", "2", ...) to fresh UUIDs while
 * preserving FK relationships.
 *
 * Idempotent: if any table already has rows, the call is rejected. To re-seed,
 * truncate the tables first via the Supabase SQL editor.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/dev/seed
 *
 * Returns 404 in production builds.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

import { mockContacts } from "@/data/mock/contacts";
import { mockLocations } from "@/data/mock/locations";
import { mockEmployees } from "@/data/mock/employees";
import { mockTeams } from "@/data/mock/teams";
import { mockBids } from "@/data/mock/bids";
import { mockBidLineItems } from "@/data/mock/bid-line-items";
import { mockProjects } from "@/data/mock/projects";
import { mockPayments } from "@/data/mock/payments";
import { mockMaintenancePlans } from "@/data/mock/maintenance-plans";
import { mockMaintenanceVisits } from "@/data/mock/maintenance-visits";
import { mockMaintenanceItems } from "@/data/mock/maintenance-items";
import { mockItemsCatalog } from "@/data/mock/items-catalog";
import { mockHardCosts } from "@/data/mock/hard-costs";
import { mockCompanySettings } from "@/data/mock/company-settings";
import { mockScheduleBlocks } from "@/data/mock/schedule-blocks";
import { mockCommunications } from "@/data/mock/communications";
import {
  mockBidOverheads,
  mockMilestones,
  mockProposals,
  mockProposalThemes,
  mockOverheadTemplates,
  mockOverheadTemplateLines,
  mockRoutePlans,
  mockRolePermissions,
  mockPhotos,
  mockDoorToDoorPins,
} from "@/data/mock/misc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.warn("[seed] /api/dev/seed is mounted in production — disable before launch");
}

type IdMap = Map<string, string>;
type RemapRegistry = Record<string, IdMap>;

// Fields that hold a single FK reference. Maps table name → { column → target table }.
const FK_FIELDS: Record<string, Record<string, string>> = {
  locations:               { contact_id: "contacts" },
  teams:                   { lead_id: "employees" },
  employees:               { team_id: "teams" },
  bids:                    { contact_id: "contacts", project_id: "projects" },
  projects:                { contact_id: "contacts", location_id: "locations", bid_id: "bids", assigned_team_id: "teams" },
  bid_line_items:          { bid_id: "bids" },
  bid_overheads:           { bid_id: "bids" },
  payments:                { contact_id: "contacts", project_id: "projects", location_id: "locations", bid_id: "bids", maintenance_visit_id: "maintenance_visits", maintenance_plan_id: "maintenance_plans" },
  maintenance_plans:       { contact_id: "contacts", location_id: "locations", assigned_team_id: "teams" },
  maintenance_visits:      { maintenance_plan_id: "maintenance_plans", contact_id: "contacts", location_id: "locations", assigned_team_id: "teams" },
  milestones:              { project_id: "projects" },
  photos:                  { project_id: "projects", contact_id: "contacts", milestone_id: "milestones" },
  proposals:               { bid_id: "bids" },
  overhead_template_lines: { overhead_template_id: "overhead_templates" },
  schedule_blocks:         { project_id: "projects", maintenance_visit_id: "maintenance_visits", location_id: "locations", assigned_team_id: "teams" },
  route_plans:             { team_id: "teams" },
  communications:          { contact_id: "contacts" },
  door_to_door_pins:       { contact_id: "contacts", assigned_employee_id: "employees" },
};

// Fields that hold an array of FK references.
const FK_ARRAY_FIELDS: Record<string, Record<string, string>> = {
  teams:              { member_ids: "employees" },
  projects:           { assigned_employee_ids: "employees" },
  maintenance_plans:  { assigned_employee_ids: "employees" },
  maintenance_visits: { assigned_employee_ids: "employees" },
  schedule_blocks:    { assigned_employee_ids: "employees" },
};

// communications.related_id is a polymorphic uuid keyed by related_type.
const COMMUNICATIONS_RELATED_TARGETS: Record<string, string> = {
  visit:   "maintenance_visits",
  project: "projects",
  invoice: "payments",
  bid:     "bids",
  // 'general' has no target — leave related_id null.
};

/** Generate a UUID for each mock row, indexed by 1-based mock id ("1", "2", ...). */
function buildIdMap(rows: unknown[]): IdMap {
  const map: IdMap = new Map();
  rows.forEach((_, idx) => map.set(String(idx + 1), randomUUID()));
  return map;
}

function remapFk(value: unknown, targetTable: string, registry: RemapRegistry): string | null {
  if (value === undefined || value === null || value === "") return null;
  const mapped = registry[targetTable]?.get(String(value));
  if (!mapped) {
    throw new Error(`No remap for ${targetTable}.id = "${value}"`);
  }
  return mapped;
}

function remapRow(
  table: string,
  row: Record<string, unknown>,
  registry: RemapRegistry,
  rowIdx: number,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };

  // Drop legacy column we removed when renaming to single-tenant model.
  delete out.company_id;

  // Assign the pre-computed UUID for this row.
  const ownId = registry[table]?.get(String(rowIdx + 1));
  if (ownId) out.id = ownId;

  // Single FK columns
  const fkSpec = FK_FIELDS[table] ?? {};
  for (const [col, targetTable] of Object.entries(fkSpec)) {
    if (col in out) {
      out[col] = remapFk(out[col], targetTable, registry);
    }
  }

  // Array FK columns
  const arrSpec = FK_ARRAY_FIELDS[table] ?? {};
  for (const [col, targetTable] of Object.entries(arrSpec)) {
    const arr = out[col];
    if (Array.isArray(arr)) {
      out[col] = arr.map((v) => remapFk(v, targetTable, registry));
    }
  }

  // communications.related_id is polymorphic — pick target table from related_type.
  if (table === "communications" && out.related_id != null) {
    const relatedType = out.related_type as string | undefined;
    const targetTable = relatedType ? COMMUNICATIONS_RELATED_TARGETS[relatedType] : undefined;
    if (targetTable) {
      out.related_id = remapFk(out.related_id, targetTable, registry);
    } else {
      out.related_id = null;
    }
  }

  // route_plans.stops is jsonb with embedded contact_ids — remap inside.
  if (table === "route_plans" && Array.isArray(out.stops)) {
    out.stops = (out.stops as Array<Record<string, unknown>>).map((stop) => ({
      ...stop,
      contact_id: stop.contact_id
        ? remapFk(stop.contact_id, "contacts", registry)
        : stop.contact_id,
    }));
  }

  return out;
}

export async function POST() {
  try {
    const supabase = getSupabaseAdmin();

    // Idempotency guard — refuse to seed if contacts already populated.
    const { count: existingContacts, error: countErr } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true });
    if (countErr) throw new Error(`Pre-seed check failed: ${countErr.message}`);
    if ((existingContacts ?? 0) > 0) {
      return NextResponse.json(
        { ok: false, message: "Contacts table already has rows — refusing to seed. Truncate first." },
        { status: 409 }
      );
    }

    // Pre-compute UUID maps for every table that other tables FK into.
    const registry: RemapRegistry = {
      contacts:                buildIdMap(mockContacts),
      locations:               buildIdMap(mockLocations),
      employees:               buildIdMap(mockEmployees),
      teams:                   buildIdMap(mockTeams),
      bids:                    buildIdMap(mockBids),
      projects:                buildIdMap(mockProjects),
      bid_line_items:          buildIdMap(mockBidLineItems),
      bid_overheads:           buildIdMap(mockBidOverheads),
      payments:                buildIdMap(mockPayments),
      maintenance_plans:       buildIdMap(mockMaintenancePlans),
      maintenance_visits:      buildIdMap(mockMaintenanceVisits),
      maintenance_items:       buildIdMap(mockMaintenanceItems),
      items_catalog:           buildIdMap(mockItemsCatalog),
      hard_costs:              buildIdMap(mockHardCosts),
      company_settings:        buildIdMap(mockCompanySettings),
      milestones:              buildIdMap(mockMilestones),
      photos:                  buildIdMap(mockPhotos),
      proposals:               buildIdMap(mockProposals),
      proposal_themes:         buildIdMap(mockProposalThemes),
      overhead_templates:      buildIdMap(mockOverheadTemplates),
      overhead_template_lines: buildIdMap(mockOverheadTemplateLines),
      schedule_blocks:         buildIdMap(mockScheduleBlocks),
      route_plans:             buildIdMap(mockRoutePlans),
      communications:          buildIdMap(mockCommunications),
      door_to_door_pins:       buildIdMap(mockDoorToDoorPins),
      role_permissions:        buildIdMap(mockRolePermissions),
    };

    // Insert order respects FK dependencies. Tables with circular FKs (bids ↔
    // projects, employees ↔ teams) get inserted in two passes: parents first
    // with their cycle-closing FK nulled, then a second update pass restores it.
    type Plan = { table: string; rows: unknown[]; deferFkColumns?: string[] };
    const plan: Plan[] = [
      { table: "contacts", rows: mockContacts },
      // employees first WITHOUT team_id, teams refer to employees, then update employees.team_id
      { table: "employees", rows: mockEmployees, deferFkColumns: ["team_id"] },
      { table: "teams", rows: mockTeams },
      // bids first WITHOUT project_id, projects refer to bids, then update bids.project_id
      { table: "bids", rows: mockBids, deferFkColumns: ["project_id"] },
      { table: "locations", rows: mockLocations },
      { table: "projects", rows: mockProjects },
      { table: "bid_line_items", rows: mockBidLineItems },
      { table: "bid_overheads", rows: mockBidOverheads },
      { table: "maintenance_plans", rows: mockMaintenancePlans },
      { table: "maintenance_visits", rows: mockMaintenanceVisits },
      { table: "maintenance_items", rows: mockMaintenanceItems },
      { table: "payments", rows: mockPayments },
      { table: "items_catalog", rows: mockItemsCatalog },
      { table: "hard_costs", rows: mockHardCosts },
      { table: "company_settings", rows: mockCompanySettings },
      { table: "milestones", rows: mockMilestones },
      { table: "photos", rows: mockPhotos },
      { table: "proposals", rows: mockProposals },
      { table: "proposal_themes", rows: mockProposalThemes },
      { table: "overhead_templates", rows: mockOverheadTemplates },
      { table: "overhead_template_lines", rows: mockOverheadTemplateLines },
      { table: "schedule_blocks", rows: mockScheduleBlocks },
      { table: "route_plans", rows: mockRoutePlans },
      { table: "communications", rows: mockCommunications },
      { table: "door_to_door_pins", rows: mockDoorToDoorPins },
      { table: "role_permissions", rows: mockRolePermissions },
      // company_memberships skipped — user_id is uuid FK to auth.users, populate after auth is wired.
    ];

    const summary: Array<{ table: string; inserted: number }> = [];
    const deferred: Array<{ table: string; column: string; rowIdx: number; rawValue: unknown }> = [];

    for (const { table, rows, deferFkColumns } of plan) {
      if (rows.length === 0) {
        summary.push({ table, inserted: 0 });
        continue;
      }
      const remapped = rows.map((row, idx) => {
        const r = remapRow(table, row as Record<string, unknown>, registry, idx);
        // Stash deferred FK values for later patching, then null them for first insert.
        if (deferFkColumns) {
          for (const col of deferFkColumns) {
            if (r[col] != null) {
              deferred.push({ table, column: col, rowIdx: idx, rawValue: r[col] });
              r[col] = null;
            }
          }
        }
        return r;
      });

      const { error } = await supabase.from(table).insert(remapped as never);
      if (error) {
        return NextResponse.json(
          { ok: false, table, message: error.message, hint: error.hint, summary },
          { status: 500 }
        );
      }
      summary.push({ table, inserted: rows.length });
    }

    // Pass 2 — patch the deferred FKs now that all parent rows exist.
    for (const d of deferred) {
      const ownId = registry[d.table]!.get(String(d.rowIdx + 1))!;
      const { error } = await supabase
        .from(d.table)
        .update({ [d.column]: d.rawValue } as never)
        .eq("id", ownId);
      if (error) {
        return NextResponse.json(
          { ok: false, message: `Deferred FK patch failed for ${d.table}.${d.column}: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Seed complete.",
      tables: summary,
      deferred_patches: deferred.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ ok: false, message, stack }, { status: 500 });
  }
}
