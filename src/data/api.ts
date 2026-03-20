import { MockEntityStore } from "./store";
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

import { mockContacts } from "./mock/contacts";
import { mockEmployees } from "./mock/employees";
import { mockTeams } from "./mock/teams";
import { mockProjects } from "./mock/projects";
import { mockBids } from "./mock/bids";
import { mockBidLineItems } from "./mock/bid-line-items";
import { mockPayments } from "./mock/payments";
import { mockMaintenancePlans } from "./mock/maintenance-plans";
import { mockMaintenanceVisits } from "./mock/maintenance-visits";
import { mockMaintenanceItems } from "./mock/maintenance-items";
import { mockItemsCatalog } from "./mock/items-catalog";
import { mockHardCosts } from "./mock/hard-costs";
import { mockCompanySettings } from "./mock/company-settings";
import { mockScheduleBlocks } from "./mock/schedule-blocks";
import { mockLocations } from "./mock/locations";
import { mockCommunications } from "./mock/communications";
import {
  mockBidOverheads, mockMilestones, mockProposals,
  mockProposalThemes, mockOverheadTemplates, mockOverheadTemplateLines,
  mockRoutePlans, mockRolePermissions, mockCompanyMemberships,
  mockPhotos, mockDoorToDoorPins,
} from "./mock/misc";

export const db = {
  Contact: new MockEntityStore<Contact>("Contact", mockContacts as any[]),
  Project: new MockEntityStore<Project>("Project", mockProjects as any[]),
  Bid: new MockEntityStore<Bid>("Bid", mockBids as any[]),
  BidLineItem: new MockEntityStore<BidLineItem>("BidLineItem", mockBidLineItems as any[]),
  BidOverhead: new MockEntityStore<BidOverhead>("BidOverhead", mockBidOverheads as any[]),
  Payment: new MockEntityStore<Payment>("Payment", mockPayments as any[]),
  Employee: new MockEntityStore<Employee>("Employee", mockEmployees as any[]),
  Team: new MockEntityStore<Team>("Team", mockTeams as any[]),
  MaintenancePlan: new MockEntityStore<MaintenancePlan>("MaintenancePlan", mockMaintenancePlans as any[]),
  MaintenanceVisit: new MockEntityStore<MaintenanceVisit>("MaintenanceVisit", mockMaintenanceVisits as any[]),
  MaintenanceItem: new MockEntityStore<MaintenanceItem>("MaintenanceItem", mockMaintenanceItems as any[]),
  ItemsCatalog: new MockEntityStore<ItemsCatalog>("ItemsCatalog", mockItemsCatalog as any[]),
  ItemCategory: new MockEntityStore<ItemCategory>("ItemCategory", []),
  HardCost: new MockEntityStore<HardCost>("HardCost", mockHardCosts as any[]),
  CompanySetting: new MockEntityStore<CompanySetting>("CompanySetting", mockCompanySettings as any[]),
  Milestone: new MockEntityStore<Milestone>("Milestone", mockMilestones as any[]),
  Photo: new MockEntityStore<Photo>("Photo", mockPhotos as any[]),
  Proposal: new MockEntityStore<Proposal>("Proposal", mockProposals as any[]),
  ProposalTheme: new MockEntityStore<ProposalTheme>("ProposalTheme", mockProposalThemes as any[]),
  OverheadTemplate: new MockEntityStore<OverheadTemplate>("OverheadTemplate", mockOverheadTemplates as any[]),
  OverheadTemplateLine: new MockEntityStore<OverheadTemplateLine>("OverheadTemplateLine", mockOverheadTemplateLines as any[]),
  ScheduleBlock: new MockEntityStore<ScheduleBlock>("ScheduleBlock", mockScheduleBlocks as any[]),
  RoutePlan: new MockEntityStore<RoutePlan>("RoutePlan", mockRoutePlans as any[]),
  Communication: new MockEntityStore<Communication>("Communication", mockCommunications as any[]),
  DoorToDoorPin: new MockEntityStore<DoorToDoorPin>("DoorToDoorPin", mockDoorToDoorPins as any[]),
  RolePermission: new MockEntityStore<RolePermission>("RolePermission", mockRolePermissions as any[]),
  CompanyMembership: new MockEntityStore<CompanyMembership>("CompanyMembership", mockCompanyMemberships as any[]),
  Location: new MockEntityStore<Location>("Location", mockLocations as any[]),
};
