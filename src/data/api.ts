/**
 * `db` — entity stores backed by Supabase.
 *
 * Mirrors the original MockEntityStore API (list/filter/get/create/update/
 * delete/bulkCreate) so consumers don't need to change.
 *
 * The mock store is preserved at src/data/store.ts and src/data/mock/* for
 * the seed endpoint (/api/dev/seed) to load demo data on a fresh DB.
 */

import { SupabaseEntityStore } from "@/lib/supabase/entity-store";
import {
  Contact, Project, Bid, BidLineItem, BidOverhead,
  Payment, Employee, Team,
  MaintenancePlan, MaintenanceVisit, MaintenanceItem,
  ItemsCatalog, ItemCategory, HardCost, CompanySetting,
  Milestone, Photo, Proposal, ProposalTheme,
  OverheadTemplate, OverheadTemplateLine,
  ScheduleBlock, RoutePlan, Communication, DoorToDoorPin,
  RolePermission, CompanyMembership, Location,
} from "./types";

export const db = {
  Contact:                new SupabaseEntityStore<Contact>("contacts"),
  Project:                new SupabaseEntityStore<Project>("projects"),
  Bid:                    new SupabaseEntityStore<Bid>("bids"),
  BidLineItem:            new SupabaseEntityStore<BidLineItem>("bid_line_items"),
  BidOverhead:            new SupabaseEntityStore<BidOverhead>("bid_overheads"),
  Payment:                new SupabaseEntityStore<Payment>("payments"),
  Employee:               new SupabaseEntityStore<Employee>("employees"),
  Team:                   new SupabaseEntityStore<Team>("teams"),
  MaintenancePlan:        new SupabaseEntityStore<MaintenancePlan>("maintenance_plans"),
  MaintenanceVisit:       new SupabaseEntityStore<MaintenanceVisit>("maintenance_visits"),
  MaintenanceItem:        new SupabaseEntityStore<MaintenanceItem>("maintenance_items"),
  ItemsCatalog:           new SupabaseEntityStore<ItemsCatalog>("items_catalog"),
  ItemCategory:           new SupabaseEntityStore<ItemCategory>("item_categories"),
  HardCost:               new SupabaseEntityStore<HardCost>("hard_costs"),
  CompanySetting:         new SupabaseEntityStore<CompanySetting>("company_settings"),
  Milestone:              new SupabaseEntityStore<Milestone>("milestones"),
  Photo:                  new SupabaseEntityStore<Photo>("photos"),
  Proposal:               new SupabaseEntityStore<Proposal>("proposals"),
  ProposalTheme:          new SupabaseEntityStore<ProposalTheme>("proposal_themes"),
  OverheadTemplate:       new SupabaseEntityStore<OverheadTemplate>("overhead_templates"),
  OverheadTemplateLine:   new SupabaseEntityStore<OverheadTemplateLine>("overhead_template_lines"),
  ScheduleBlock:          new SupabaseEntityStore<ScheduleBlock>("schedule_blocks"),
  RoutePlan:              new SupabaseEntityStore<RoutePlan>("route_plans"),
  Communication:          new SupabaseEntityStore<Communication>("communications"),
  DoorToDoorPin:          new SupabaseEntityStore<DoorToDoorPin>("door_to_door_pins"),
  RolePermission:         new SupabaseEntityStore<RolePermission>("role_permissions"),
  CompanyMembership:      new SupabaseEntityStore<CompanyMembership>("company_memberships"),
  Location:               new SupabaseEntityStore<Location>("locations"),
};
