"use client";

import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import ContactCard from "@/components/contacts/contact-card";
import ContactListItem from "@/components/contacts/contact-list-item";
import { SECTION_COLORS, type SectionColor } from "@/lib/status-styles";
import type { Contact, Location, Project } from "@/data/types";

export interface ContactWithStatus extends Contact {
  isMaintenance: boolean;
  isProject: boolean;
  isLead: boolean;
  isCommercial: boolean;
  nextVisit: { visit_date: string } | null;
  mostRecentProject: Project | null;
  [key: string]: unknown;
}

interface ContactSectionProps {
  title: string;
  subtitle: string;
  contacts: ContactWithStatus[];
  sectionColor: SectionColor;
  sectionKey: string;
  emptyMessage: string;
  viewMode: "grid" | "list";
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  allLocations: Location[];
}

export default function ContactSection({
  title,
  subtitle,
  contacts,
  sectionColor,
  emptyMessage,
  viewMode,
  isCollapsed,
  onToggleCollapse,
  onEdit,
  onDelete,
  allLocations,
}: ContactSectionProps) {
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setScrollState({
      canScrollUp: scrollTop > 0,
      canScrollDown: scrollTop + clientHeight < scrollHeight - 5,
    });
  };

  const isMaintenance = sectionColor === "green";
  const isLead = sectionColor === "amber";
  const isArchived = sectionColor === "gray";
  const isCommercialSection = sectionColor === "purple";
  const isEmpty = contacts.length === 0;

  const colorClasses = SECTION_COLORS.badge;
  const borderClasses = SECTION_COLORS.border;
  const bgClasses = SECTION_COLORS.bg;

  return (
    <div
      className={`rounded-xl border ${borderClasses[sectionColor]} overflow-hidden`}
    >
      {/* Collapsible Header */}
      <div
        className={`w-full flex items-center gap-3 px-4 py-3 ${bgClasses[sectionColor]} transition-all min-w-0`}
      >
        <button
          onClick={onToggleCollapse}
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
                {title}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${colorClasses[sectionColor]}`}
              >
                {contacts.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block truncate">
              {subtitle}
            </p>
          </div>
        </button>

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
                style={{ maxHeight: 1320 }}
                onScroll={handleScroll}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
                  {contacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      isMaintenance={isMaintenance}
                      isLead={isLead}
                      isArchived={isArchived}
                      isCommercial={isCommercialSection || contact.isCommercial}
                      locationCount={contact.isCommercial ? allLocations.filter((l) => l.contact_id === contact.id).length : undefined}
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
                style={{ maxHeight: 480 }}
                onScroll={handleScroll}
              >
                <div className="bg-card">
                  {contacts.map((contact, index) => (
                    <ContactListItem
                      key={contact.id}
                      contact={contact}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      isLast={index === contacts.length - 1}
                      isMaintenance={isMaintenance}
                      isLead={isLead}
                      isArchived={isArchived}
                      isCommercial={isCommercialSection || contact.isCommercial}
                      locationCount={contact.isCommercial ? allLocations.filter((l) => l.contact_id === contact.id).length : undefined}
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
}
