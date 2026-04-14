"use client";

import React, { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/data/api";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/providers/company-provider";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, Search, UserPlus, LayoutGrid, List,
  ArrowUpDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routes } from "@/lib/routes";

import ContactSection from "@/components/contacts/contact-section";
import type { ContactWithStatus } from "@/components/contacts/contact-section";
import CreateContactDialog from "@/components/contacts/create-contact-dialog";
import EditContactDialog from "@/components/contacts/edit-contact-dialog";
import DeleteContactDialog from "@/components/contacts/delete-contact-dialog";
import PageHeader from "@/components/shared/page-header";
import type { Contact, MaintenancePlan, MaintenanceVisit, Project, Bid, Location } from "@/data/types";

export default function ContactsPageWrapper() {
  return (
    <Suspense>
      <ContactsPage />
    </Suspense>
  );
}

function ContactsPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortMode, setSortMode] = useState<"recent" | "alphabetical">("alphabetical");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Auto-open create dialog when routed with ?create=true (e.g. from dashboard)
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreateDialog(true);
    }
  }, [searchParams]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
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
        (p) => p.contact_id === contact.id && !p.archived_at
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
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      // Search name, email, phone, address, company name
      if (
        contact.first_name?.toLowerCase().includes(search) ||
        contact.last_name?.toLowerCase().includes(search) ||
        contact.email?.toLowerCase().includes(search) ||
        contact.phone?.includes(search) ||
        contact.company_name?.toLowerCase().includes(search) ||
        contact.address_line1?.toLowerCase().includes(search) ||
        contact.city?.toLowerCase().includes(search)
      ) return true;
      // Search service location names for commercial contacts
      if (contact.contact_type === "commercial") {
        const contactLocations = allLocations.filter((l) => l.contact_id === contact.id);
        if (contactLocations.some((l) => l.name.toLowerCase().includes(search))) return true;
      }
      return false;
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
              placeholder="Search by name, email, phone, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-lg border-border focus:border-green-500"
            />
          </div>

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
            <ContactSection
              title="Commercial Accounts"
              subtitle="Commercial contacts with multiple locations."
              contacts={commercialContacts}
              sectionColor="purple"
              sectionKey="commercial"
              emptyMessage="No commercial accounts yet."
              viewMode={viewMode}
              isCollapsed={!!collapsedSections["commercial"]}
              onToggleCollapse={() => toggleSection("commercial")}

              onEdit={handleEdit}
              onDelete={handleDelete}
              allLocations={allLocations}
            />
            <ContactSection
              title="Maintenance Accounts"
              subtitle="Contacts with active maintenance plans."
              contacts={maintenanceContacts}
              sectionColor="green"
              sectionKey="maintenance"
              emptyMessage="No maintenance accounts yet."
              viewMode={viewMode}
              isCollapsed={!!collapsedSections["maintenance"]}
              onToggleCollapse={() => toggleSection("maintenance")}

              onEdit={handleEdit}
              onDelete={handleDelete}
              allLocations={allLocations}
            />
            <ContactSection
              title="Project Accounts"
              subtitle="Contacts with active projects or bids."
              contacts={projectContacts}
              sectionColor="blue"
              sectionKey="project"
              emptyMessage="No project accounts yet."
              viewMode={viewMode}
              isCollapsed={!!collapsedSections["project"]}
              onToggleCollapse={() => toggleSection("project")}

              onEdit={handleEdit}
              onDelete={handleDelete}
              allLocations={allLocations}
            />
            <ContactSection
              title="Lead Accounts"
              subtitle="Contacts with no projects or maintenance plans."
              contacts={leadContacts}
              sectionColor="amber"
              sectionKey="lead"
              emptyMessage="No leads yet."
              viewMode={viewMode}
              isCollapsed={!!collapsedSections["lead"]}
              onToggleCollapse={() => toggleSection("lead")}

              onEdit={handleEdit}
              onDelete={handleDelete}
              allLocations={allLocations}
            />
            <ContactSection
              title="Archived Accounts"
              subtitle="Contacts that have been archived."
              contacts={archivedContacts}
              sectionColor="gray"
              sectionKey="archived"
              emptyMessage="No archived accounts."
              viewMode={viewMode}
              isCollapsed={!!collapsedSections["archived"]}
              onToggleCollapse={() => toggleSection("archived")}

              onEdit={handleEdit}
              onDelete={handleDelete}
              allLocations={allLocations}
            />
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

      </div>
    </div>
  );
}
