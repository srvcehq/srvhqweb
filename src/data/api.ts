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
  Contact: new MockEntityStore<Contact>("Contact", mockContacts),
  Project: new MockEntityStore<Project>("Project", mockProjects),
  Bid: new MockEntityStore<Bid>("Bid", mockBids),
  BidLineItem: new MockEntityStore<BidLineItem>("BidLineItem", mockBidLineItems),
  BidOverhead: new MockEntityStore<BidOverhead>("BidOverhead", mockBidOverheads),
  Payment: new MockEntityStore<Payment>("Payment", mockPayments),
  Employee: new MockEntityStore<Employee>("Employee", mockEmployees),
  Team: new MockEntityStore<Team>("Team", mockTeams),
  MaintenancePlan: new MockEntityStore<MaintenancePlan>("MaintenancePlan", mockMaintenancePlans),
  MaintenanceVisit: new MockEntityStore<MaintenanceVisit>("MaintenanceVisit", mockMaintenanceVisits),
  MaintenanceItem: new MockEntityStore<MaintenanceItem>("MaintenanceItem", mockMaintenanceItems),
  ItemsCatalog: new MockEntityStore<ItemsCatalog>("ItemsCatalog", mockItemsCatalog),
  ItemCategory: new MockEntityStore<ItemCategory>("ItemCategory", []),
  HardCost: new MockEntityStore<HardCost>("HardCost", mockHardCosts),
  CompanySetting: new MockEntityStore<CompanySetting>("CompanySetting", mockCompanySettings),
  Milestone: new MockEntityStore<Milestone>("Milestone", mockMilestones),
  Photo: new MockEntityStore<Photo>("Photo", mockPhotos),
  Proposal: new MockEntityStore<Proposal>("Proposal", mockProposals),
  ProposalTheme: new MockEntityStore<ProposalTheme>("ProposalTheme", mockProposalThemes),
  OverheadTemplate: new MockEntityStore<OverheadTemplate>("OverheadTemplate", mockOverheadTemplates),
  OverheadTemplateLine: new MockEntityStore<OverheadTemplateLine>("OverheadTemplateLine", mockOverheadTemplateLines),
  ScheduleBlock: new MockEntityStore<ScheduleBlock>("ScheduleBlock", mockScheduleBlocks),
  RoutePlan: new MockEntityStore<RoutePlan>("RoutePlan", mockRoutePlans),
  Communication: new MockEntityStore<Communication>("Communication", mockCommunications),
  DoorToDoorPin: new MockEntityStore<DoorToDoorPin>("DoorToDoorPin", mockDoorToDoorPins),
  RolePermission: new MockEntityStore<RolePermission>("RolePermission", mockRolePermissions),
  CompanyMembership: new MockEntityStore<CompanyMembership>("CompanyMembership", mockCompanyMemberships),
  Location: new MockEntityStore<Location>("Location", mockLocations),
};
