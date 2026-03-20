"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail, Phone, MapPin, FileText, MoreVertical,
  Pencil, Trash2, AlertCircle, Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { routes } from "@/lib/routes";

import type { Contact } from "@/data/types";

interface ContactWithStatus extends Contact {
  isMaintenance?: boolean;
  isProject?: boolean;
  isLead?: boolean;
  nextVisit?: { visit_date: string } | null;
  mostRecentProject?: unknown;
  [key: string]: unknown;
}

function getContactAlerts(contact: ContactWithStatus) {
  const alerts: { key: string; label: string; tone: string; tooltip?: string }[] = [];

  const missingPhone = !contact.phone || (contact.phone as string).trim() === "";
  const missingEmail = !contact.email || (contact.email as string).trim() === "";
  const hasAddress = contact.address_line1 || contact.city || contact.state;
  const addressUnverified = hasAddress && (!contact.latitude || !contact.longitude);
  const missingAddress = !hasAddress;

  if (missingPhone) {
    alerts.push({ key: "phone", label: "Missing phone", tone: "warning" });
  }
  if (missingEmail) {
    alerts.push({ key: "email", label: "Missing email", tone: "warning" });
  }
  if (missingAddress) {
    alerts.push({ key: "addr", label: "Missing address", tone: "warning" });
  } else if (addressUnverified) {
    alerts.push({
      key: "addr",
      label: "Address unverified",
      tone: "warning",
      tooltip: "Coordinates not saved yet. Open contact, Edit, then Refresh coordinates.",
    });
  }

  return alerts;
}

interface ContactListItemProps {
  contact: ContactWithStatus;
  onEdit: (contact: ContactWithStatus) => void;
  onDelete: (contact: ContactWithStatus) => void;
  isLast?: boolean;
  isMaintenance?: boolean;
  isLead?: boolean;
  isArchived?: boolean;
  isCommercial?: boolean;
  locationCount?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function ContactListItem({
  contact,
  onEdit,
  onDelete,
  isLast,
  isMaintenance,
  isLead,
  isArchived,
  isCommercial,
  locationCount,
  isSelected,
  onToggleSelect,
}: ContactListItemProps) {
  const router = useRouter();

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const companyName = contact.company_name as string | undefined;
  const displayName = isCommercial && companyName ? companyName : fullName;
  const fullAddress = [
    contact.address_line1,
    contact.address_line2,
    contact.city,
    contact.state,
    contact.zip,
  ]
    .filter(Boolean)
    .join(", ");

  const statusBadges: { label: string; color: string }[] = [];

  if (isArchived) {
    statusBadges.push({ label: "Archived", color: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/40 dark:text-gray-400" });
  }
  if (isCommercial) {
    statusBadges.push({ label: "Commercial", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400" });
  }
  if (contact.isMaintenance) {
    statusBadges.push({ label: "Maintenance", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" });
  }
  if (contact.isProject) {
    statusBadges.push({ label: "Project", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" });
  }
  if (contact.isLead) {
    statusBadges.push({ label: "Lead", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" });
  }

  const alerts = getContactAlerts(contact);
  const displayAlerts = alerts.slice(0, 3);
  const overflowCount = alerts.length - displayAlerts.length;

  const avatarColor = isArchived
    ? "from-gray-400 to-gray-500"
    : isCommercial
      ? "from-purple-500 to-indigo-600"
      : isMaintenance
        ? "from-green-500 to-emerald-600"
        : isLead
          ? "from-amber-500 to-orange-600"
          : "from-blue-500 to-indigo-600";

  const handleViewDetails = () => {
    router.push(routes.contactDetail(contact.id));
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 hover:bg-accent transition-colors cursor-pointer ${
        !isLast ? "border-b border-border" : ""
      } ${isSelected ? "bg-accent" : ""}`}
      onClick={handleViewDetails}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={`w-12 h-12 bg-gradient-to-br ${avatarColor} rounded-full flex items-center justify-center shadow-md`}
        >
          <span className="text-white font-bold text-lg">
            {isCommercial && companyName
              ? companyName.slice(0, 2).toUpperCase()
              : `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`}
          </span>
        </div>
      </div>

      {/* Name */}
      <div className="flex-shrink-0 w-48">
        <h3 className="font-bold text-foreground">{displayName}</h3>
        {isCommercial && companyName && (
          <p className="text-xs text-muted-foreground">{fullName}</p>
        )}
        {isCommercial && locationCount != null && locationCount > 0 && (
          <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 mt-1">
            <Building2 className="w-3 h-3 mr-1" />
            {locationCount} {locationCount === 1 ? "location" : "locations"}
          </Badge>
        )}
        {(statusBadges.length > 0 || alerts.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {statusBadges.map((badge, idx) => (
              <Badge key={idx} className={`text-xs ${badge.color}`}>
                {badge.label}
              </Badge>
            ))}
            {alerts.length > 0 && (
              <TooltipProvider>
                {displayAlerts.map((alert) =>
                  alert.tooltip ? (
                    <Tooltip key={alert.key}>
                      <TooltipTrigger asChild>
                        <Badge className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 cursor-help">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {alert.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{alert.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge
                      key={alert.key}
                      className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400"
                    >
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {alert.label}
                    </Badge>
                  )
                )}
                {overflowCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 cursor-help">
                        +{overflowCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        {alerts.slice(3).map((alert) => (
                          <p key={alert.key}>{alert.label}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            )}
          </div>
        )}
      </div>

      {/* Email */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
        <Mail className="w-4 h-4 text-green-600 flex-shrink-0" />
        <span className="truncate">{contact.email || "No email"}</span>
      </div>

      {/* Phone */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground w-40 flex-shrink-0">
        {contact.phone ? (
          <>
            <Phone className="w-4 h-4 text-green-600" />
            <span>{contact.phone}</span>
          </>
        ) : (
          <span className="text-muted-foreground italic">No phone</span>
        )}
      </div>

      {/* Address */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 min-w-0">
        {fullAddress ? (
          <>
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span className="truncate">{fullAddress}</span>
          </>
        ) : (
          <span className="text-muted-foreground italic">No address</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
          size="sm"
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          View Details
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-green-100 transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(contact);
              }}
              className="cursor-pointer"
            >
              <Pencil className="w-4 h-4 mr-2 text-blue-600" />
              <span>Edit Contact</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(contact);
              }}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span>Delete Contact</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
