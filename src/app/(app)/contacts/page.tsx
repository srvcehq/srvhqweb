"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/data/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/providers/company-provider";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, UserPlus, LayoutGrid, List,
  ArrowUpDown, ChevronRight, Archive, RotateCcw, Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { routes } from "@/lib/routes";

import ContactCard from "@/components/contacts/contact-card";
import ContactListItem from "@/components/contacts/contact-list-item";
import CreateContactDialog from "@/components/contacts/create-contact-dialog";
import EditContactDialog from "@/components/contacts/edit-contact-dialog";
import DeleteContactDialog from "@/components/contacts/delete-contact-dialog";
import BulkDeleteDialog from "@/components/contacts/bulk-delete-dialog";
import RestoreContactsDialog from "@/components/contacts/restore-contacts-dialog";
import PermanentDeleteDialog from "@/components/contacts/permanent-delete-dialog";
import PageHeader from "@/components/shared/page-header";
import type { Contact, MaintenancePlan, MaintenanceVisit, Project, Bid, Location } from "@/data/types";

interface ContactWithStatus extends Contact {
  isMaintenance: boolean;
  isProject: boolean;
  isLead: boolean;
  isCommercial: boolean;
  nextVisit: { visit_date: string } | null;
  mostRecentProject: Project | null;
  [key: string]: unknown;
}

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortMode, setSortMode] = useState<"recent" | "alphabetical">("alphabetical");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [showPermanentDelete, setShowPermanentDelete] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { currentCompanyId, isLoading: isLoadingCompany } = useCompany();

  // Collapsible section state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return { commercial: true, maintenance: true, project: true, lead: true, archived: true };
    }
    try {
      const saved = localStorage.getItem("contacts-collapsed-sections");
      return saved
        ? JSON.parse(saved)
        : { commercial: true, maintenance: true, project: true, lead: true, archived: true };
    } catch {
      return { commercial: true, maintenance: true, project: true, lead: true, archived: true };
    }
  });

  useEffect(() => {
    localStorage.setItem("contacts-collapsed-sections", JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts", currentCompanyId],
    queryFn: () =>
      db.Contact.filter({ company_id: currentCompanyId } as Partial<Contact>, "-created_date"),
    enabled: !!currentCompanyId,
  });

  const { data: allMaintenancePlans = [] } = useQuery({
    queryKey: ["maintenance-plans-all", currentCompanyId],
    queryFn: () =>
      db.MaintenancePlan.filter({ company_id: currentCompanyId } as Partial<Contact>),
    enabled: !!currentCompanyId,
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["projects", currentCompanyId],
    queryFn: () =>
      db.Project.filter(
        { company_id: currentCompanyId } as Partial<Contact>,
        "-created_date"
      ),
    enabled: !!currentCompanyId,
  });

  const { data: allVisits = [] } = useQuery({
    queryKey: ["maintenance-visits-all", currentCompanyId],
    queryFn: () =>
      db.MaintenanceVisit.filter(
        { company_id: currentCompanyId } as Partial<Contact>,
        "visit_date"
      ),
    enabled: !!currentCompanyId,
  });

  const { data: allBids = [] } = useQuery({
    queryKey: ["bids-all", currentCompanyId],
    queryFn: () =>
      db.Bid.filter({ company_id: currentCompanyId } as Partial<Contact>),
    enabled: !!currentCompanyId,
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ["locations", currentCompanyId],
    queryFn: () =>
      db.Location.filter({ company_id: currentCompanyId } as Partial<Contact>),
    enabled: !!currentCompanyId,
  });

  // Add status info to each contact
  const contactsWithStatus: ContactWithStatus[] = useMemo(() => {
    return contacts.map((contact) => {
      const hasActiveMaintenance = allMaintenancePlans.some(
        (p) =>
          p.contact_id === contact.id &&
          p.status === "active" &&
          !p.deleted_at
      );

      const hasActiveProjects = allProjects.some(
        (p) => p.contact_id === contact.id && !p.archived
      );

      const hasActiveBids = allBids.some(
        (b) =>
          b.contact_id === contact.id &&
          !b.archived_at &&
          !b.deleted_at
      );

      const isArchived = contact.isArchived || !!contact.archived_at;
      const isCommercial = !isArchived && contact.contact_type === "commercial";
      const isMaintenance = !isArchived && hasActiveMaintenance;
      const isProject = !isArchived && (hasActiveProjects || hasActiveBids);
      const isLead =
        !isArchived && !isCommercial && !hasActiveMaintenance && !hasActiveProjects && !hasActiveBids;

      // Get next visit for maintenance accounts
      const today = new Date().toISOString().split("T")[0];
      let nextVisit: { visit_date: string } | null = null;
      if (isMaintenance) {
        const contactPlans = allMaintenancePlans.filter(
          (p) =>
            p.contact_id === contact.id &&
            p.status === "active" &&
            !p.deleted_at
        );
        const planIds = contactPlans.map((p) => p.id);
        const upcomingVisits = allVisits
          .filter(
            (v) =>
              planIds.includes(v.maintenance_plan_id) &&
              v.visit_date >= today &&
              v.status !== "cancelled"
          )
          .sort((a, b) => a.visit_date.localeCompare(b.visit_date));
        nextVisit = upcomingVisits[0]
          ? { visit_date: upcomingVisits[0].visit_date }
          : null;
      }

      // Get most recent project
      const contactProjects = allProjects.filter((p) => p.contact_id === contact.id);
      const mostRecentProject =
        contactProjects.length > 0
          ? contactProjects.reduce((latest, project) => {
              const latestDate = new Date(latest.updated_date || latest.created_date);
              const projectDate = new Date(project.updated_date || project.created_date);
              return projectDate > latestDate ? project : latest;
            }, contactProjects[0])
          : null;

      return {
        ...contact,
        isMaintenance,
        isProject,
        isLead,
        isCommercial,
        nextVisit,
        mostRecentProject,
      };
    });
  }, [contacts, allMaintenancePlans, allProjects, allVisits, allBids]);

  // Filter by search, then categorize
  const { commercialContacts, maintenanceContacts, projectContacts, leadContacts, archivedContacts } = useMemo(() => {
    let filtered = contactsWithStatus.filter((contact) => {
      const search = searchQuery.toLowerCase();
      return (
        contact.first_name?.toLowerCase().includes(search) ||
        contact.last_name?.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.phone?.includes(search)
      );
    });

    const archived = filtered.filter((c) => c.archived_at || c.isArchived);
    const active = filtered.filter((c) => !c.archived_at && !c.isArchived);
    const commercial = active.filter((c) => c.isCommercial);
    const residential = active.filter((c) => !c.isCommercial);
    const maintenance = residential.filter((c) => c.isMaintenance);
    const project = residential.filter((c) => c.isProject);
    const lead = residential.filter((c) => c.isLead);

    const sortContacts = (arr: ContactWithStatus[]) => {
      if (sortMode === "alphabetical") {
        arr.sort((a, b) => {
          const lastA = (a.last_name || "").trim().toLowerCase();
          const lastB = (b.last_name || "").trim().toLowerCase();
          const firstA = (a.first_name || "").trim().toLowerCase();
          const firstB = (b.first_name || "").trim().toLowerCase();

          if (lastA !== lastB) return lastA.localeCompare(lastB);
          return firstA.localeCompare(firstB);
        });
      } else {
        arr.sort((a, b) => {
          const dateA = new Date(a.created_date);
          const dateB = new Date(b.created_date);
          return dateB.getTime() - dateA.getTime();
        });
      }
    };

    sortContacts(commercial);
    sortContacts(maintenance);
    sortContacts(project);
    sortContacts(lead);
    sortContacts(archived);

    return {
      commercialContacts: commercial,
      maintenanceContacts: maintenance,
      projectContacts: project,
      leadContacts: lead,
      archivedContacts: archived,
    };
  }, [contactsWithStatus, searchQuery, sortMode]);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleDelete = (contact: Contact) => {
    setDeletingContact(contact);
  };

  // Selection handlers
  const toggleSelectContact = (contactId: string) => {
    setSelectedContactIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const toggleSelectSection = (sectionContacts: ContactWithStatus[]) => {
    const sectionIds = sectionContacts.map((c) => c.id);
    const allSectionSelected = sectionIds.every((id) => selectedContactIds.has(id));

    setSelectedContactIds((prev) => {
      const newSet = new Set(prev);
      if (allSectionSelected) {
        sectionIds.forEach((id) => newSet.delete(id));
      } else {
        sectionIds.forEach((id) => newSet.add(id));
      }
      return newSet;
    });
  };

  const getSectionCheckboxState = (sectionContacts: ContactWithStatus[]) => {
    if (sectionContacts.length === 0) return { checked: false, indeterminate: false };
    const sectionIds = sectionContacts.map((c) => c.id);
    const selectedCount = sectionIds.filter((id) => selectedContactIds.has(id)).length;

    return {
      checked: selectedCount === sectionIds.length,
      indeterminate: selectedCount > 0 && selectedCount < sectionIds.length,
    };
  };

  const handleBulkDeleteComplete = () => {
    setSelectedContactIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
  };

  const selectedContacts = useMemo(() => {
    return contactsWithStatus.filter((c) => selectedContactIds.has(c.id));
  }, [contactsWithStatus, selectedContactIds]);

  const allSelectedAreArchived = useMemo(() => {
    if (selectedContacts.length === 0) return false;
    return selectedContacts.every((c) => c.isArchived || c.archived_at);
  }, [selectedContacts]);

  const [scrollStates, setScrollStates] = useState<
    Record<string, { canScrollUp: boolean; canScrollDown: boolean }>
  >({});

  const handleScroll = (sectionKey: string, e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setScrollStates((prev) => ({
      ...prev,
      [sectionKey]: {
        canScrollUp: scrollTop > 0,
        canScrollDown: scrollTop + clientHeight < scrollHeight - 5,
      },
    }));
  };

  const renderContactSection = (
    sectionTitle: string,
    subtitle: string,
    sectionContacts: ContactWithStatus[],
    sectionColor: "green" | "blue" | "amber" | "gray" | "purple",
    sectionKey: string,
    emptyMessage: string
  ) => {
    const isMaintenance = sectionColor === "green";
    const isLead = sectionColor === "amber";
    const isArchived = sectionColor === "gray";
    const isCommercialSection = sectionColor === "purple";
    const isCollapsed = collapsedSections[sectionKey];
    const isEmpty = sectionContacts.length === 0;
    const { checked, indeterminate } = getSectionCheckboxState(sectionContacts);
    const scrollState = scrollStates[sectionKey] || {
      canScrollUp: false,
      canScrollDown: false,
    };

    const colorClasses: Record<string, string> = {
      green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      gray: "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400",
      purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    };

    const borderClasses: Record<string, string> = {
      green: "border-green-200 dark:border-green-800/40",
      blue: "border-blue-200 dark:border-blue-800/40",
      amber: "border-amber-200 dark:border-amber-800/40",
      gray: "border-gray-200 dark:border-gray-700",
      purple: "border-purple-200 dark:border-purple-800/40",
    };

    const bgClasses: Record<string, string> = {
      green: "bg-green-50/50 dark:bg-green-950/20",
      blue: "bg-blue-50/50 dark:bg-blue-950/20",
      amber: "bg-amber-50/50 dark:bg-amber-950/20",
      gray: "bg-gray-50/50 dark:bg-gray-900/30",
      purple: "bg-purple-50/50 dark:bg-purple-950/20",
    };

    return (
      <div
        key={sectionKey}
        className={`rounded-xl border ${borderClasses[sectionColor]} overflow-hidden`}
      >
        {/* Collapsible Header */}
        <div
          className={`w-full flex items-center gap-3 px-4 py-3 ${bgClasses[sectionColor]} transition-all min-w-0`}
        >
          <button
            onClick={() => toggleSection(sectionKey)}
            className="flex items-start gap-3 flex-1 min-w-0 hover:opacity-90"
          >
            <ChevronRight
              className={`w-5 h-5 text-muted-foreground transition-transform duration-200 mt-0.5 flex-shrink-0 ${
                isCollapsed ? "" : "rotate-90"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground truncate">
                  {sectionTitle}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${colorClasses[sectionColor]}`}
                >
                  {sectionContacts.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 hidden sm:block truncate">
                {subtitle}
              </p>
            </div>
          </button>

          {/* Section Select All */}
          {!isEmpty && (
            <div
              className="flex items-center gap-2 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={checked}
                ref={(el) => {
                  if (el) {
                    (el as unknown as HTMLInputElement).indeterminate = indeterminate;
                  }
                }}
                onCheckedChange={() => toggleSelectSection(sectionContacts)}
                className="flex-shrink-0"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">
                Select all ({sectionContacts.length})
              </span>
            </div>
          )}
        </div>

        {/* Collapsible Content */}
        <div
          className={`transition-all duration-200 ease-in-out overflow-hidden ${
            isCollapsed ? "max-h-0" : "max-h-[5000px]"
          }`}
        >
          <div className="p-4 bg-card">
            {isEmpty ? (
              <div className="text-center py-8 text-muted-foreground italic">{emptyMessage}</div>
            ) : viewMode === "grid" ? (
              <div className="relative">
                {scrollState.canScrollUp && (
                  <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
                )}
                <div
                  className="overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
                  style={{ maxHeight: "calc(6 * 220px)" }}
                  onScroll={(e) => handleScroll(sectionKey, e)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
                    {sectionContacts.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isMaintenance={isMaintenance}
                        isLead={isLead}
                        isArchived={isArchived}
                        isCommercial={isCommercialSection || contact.isCommercial}
                        locationCount={contact.isCommercial ? allLocations.filter((l) => l.contact_id === contact.id).length : undefined}
                        isSelected={selectedContactIds.has(contact.id)}
                        onToggleSelect={() => toggleSelectContact(contact.id)}
                      />
                    ))}
                  </div>
                </div>
                {scrollState.canScrollDown && (
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
            ) : (
              <div className="relative">
                {scrollState.canScrollUp && (
                  <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none z-10" />
                )}
                <div
                  className="overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent rounded-lg border border-border shadow-sm"
                  style={{ maxHeight: "calc(6 * 80px)" }}
                  onScroll={(e) => handleScroll(sectionKey, e)}
                >
                  <div className="bg-card">
                    {sectionContacts.map((contact, index) => (
                      <ContactListItem
                        key={contact.id}
                        contact={contact}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isLast={index === sectionContacts.length - 1}
                        isMaintenance={isMaintenance}
                        isLead={isLead}
                        isArchived={isArchived}
                        isCommercial={isCommercialSection || contact.isCommercial}
                        locationCount={contact.isCommercial ? allLocations.filter((l) => l.contact_id === contact.id).length : undefined}
                        isSelected={selectedContactIds.has(contact.id)}
                        onToggleSelect={() => toggleSelectContact(contact.id)}
                      />
                    ))}
                  </div>
                </div>
                {scrollState.canScrollDown && (
                  <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingCompany) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 min-w-0">
        <PageHeader
          title="Contacts"
          subtitle="Manage your client relationships"
          actions={
            <>
              {/* Sort Control */}
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as "recent" | "alphabetical")}>
                <SelectTrigger className="w-[180px] sm:w-[200px]">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recently Created</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-2 transition-colors ${
                    viewMode === "grid"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                      : "text-foreground hover:bg-accent"
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-2 transition-colors border-l border-border ${
                    viewMode === "list"
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                      : "text-foreground hover:bg-accent"
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Contact</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </>
          }
        />

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-lg border-border focus:border-green-500"
            />
          </div>

          {/* Bulk Action Bar */}
          {selectedContactIds.size > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card border border-border rounded-lg p-3 shadow-sm gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {selectedContactIds.size} selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 min-w-0">
                {allSelectedAreArchived ? (
                  <>
                    <span className="text-xs text-muted-foreground italic hidden md:inline">
                      Restore or permanently delete archived contacts.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setShowRestore(true)}
                      className="bg-green-600 hover:bg-green-700 whitespace-nowrap"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowPermanentDelete(true)}
                      className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Permanently Delete</span>
                      <span className="sm:hidden">Delete</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground italic hidden md:inline">
                      Archiving hides contacts but keeps history.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setShowBulkDelete(true)}
                      className="bg-gray-600 hover:bg-gray-700 whitespace-nowrap"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive Selected
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {isLoadingContacts ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-2"
            }
          >
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={
                  viewMode === "grid"
                    ? "h-48 bg-muted animate-pulse rounded-xl"
                    : "h-20 bg-muted animate-pulse rounded-lg"
                }
              />
            ))}
          </div>
        ) : contactsWithStatus.length === 0 ? (
          <div className="text-center py-16">
            <UserPlus className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No contacts found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search"
                : "Get started by adding your first client"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {renderContactSection(
              "Commercial Accounts",
              "Commercial contacts with multiple locations.",
              commercialContacts,
              "purple",
              "commercial",
              "No commercial accounts yet."
            )}
            {renderContactSection(
              "Maintenance Accounts",
              "Contacts with active maintenance plans.",
              maintenanceContacts,
              "green",
              "maintenance",
              "No maintenance accounts yet."
            )}
            {renderContactSection(
              "Project Accounts",
              "Contacts with active projects or bids.",
              projectContacts,
              "blue",
              "project",
              "No project accounts yet."
            )}
            {renderContactSection(
              "Lead Accounts",
              "Contacts with no projects or maintenance plans.",
              leadContacts,
              "amber",
              "lead",
              "No leads yet."
            )}
            {renderContactSection(
              "Archived Accounts",
              "Contacts that have been archived.",
              archivedContacts,
              "gray",
              "archived",
              "No archived accounts."
            )}
          </div>
        )}

        <CreateContactDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateMaintenancePlan={(contact) => {
            // Could navigate to maintenance plan creation
          }}
          onCreateBid={(contact) => {
            router.push(`${routes.bids}?newBidContactId=${contact.id}`);
          }}
        />

        <EditContactDialog
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
        />

        <DeleteContactDialog
          open={!!deletingContact}
          onOpenChange={(open) => !open && setDeletingContact(null)}
          contact={deletingContact}
        />

        <BulkDeleteDialog
          open={showBulkDelete}
          onOpenChange={setShowBulkDelete}
          selectedContacts={selectedContacts}
          onComplete={handleBulkDeleteComplete}
        />

        <RestoreContactsDialog
          open={showRestore}
          onOpenChange={setShowRestore}
          selectedContacts={selectedContacts}
          onComplete={handleBulkDeleteComplete}
        />

        <PermanentDeleteDialog
          open={showPermanentDelete}
          onOpenChange={setShowPermanentDelete}
          selectedContacts={selectedContacts}
          onComplete={handleBulkDeleteComplete}
        />
      </div>
    </div>
  );
}
