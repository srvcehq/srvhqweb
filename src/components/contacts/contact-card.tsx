"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  hasSentBid?: boolean;
  hasAcceptedBid?: boolean;
  hasMaintenance?: boolean;
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

interface ContactCardProps {
  contact: ContactWithStatus;
  onEdit: (contact: ContactWithStatus) => void;
  onDelete: (contact: ContactWithStatus) => void;
  isMaintenance?: boolean;
  isLead?: boolean;
  isArchived?: boolean;
  isCommercial?: boolean;
  locationCount?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export default function ContactCard({
  contact,
  onEdit,
  onDelete,
  isMaintenance,
  isLead,
  isArchived,
  isCommercial,
  locationCount,
  isSelected,
  onToggleSelect,
}: ContactCardProps) {
  const router = useRouter();

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const companyName = contact.company_name as string | undefined;
  const displayName = isCommercial && companyName ? companyName : fullName;
  const fullAddress = [contact.address_line1, contact.city, contact.state]
    .filter(Boolean)
    .join(", ");

  const statusBadges: { label: string; color: string }[] = [];
  if (contact.isLead) {
    statusBadges.push({ label: "Lead", color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400" });
  }
  if (contact.isProject) {
    statusBadges.push({ label: "Project", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" });
  }
  if (contact.isMaintenance) {
    statusBadges.push({ label: "Maintenance", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" });
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

  const cardBorderColor = isArchived
    ? "border-gray-100 dark:border-gray-800"
    : isCommercial
      ? "border-purple-100 dark:border-purple-800/40"
      : isMaintenance
        ? "border-green-100 dark:border-green-800/40"
        : isLead
          ? "border-amber-100 dark:border-amber-800/40"
          : "border-blue-100 dark:border-blue-800/40";

  const cardGradient = isArchived
    ? "from-card to-gray-50/30 dark:to-gray-900/30"
    : isCommercial
      ? "from-card to-purple-50/30 dark:to-purple-950/20"
      : isMaintenance
        ? "from-card to-green-50/30 dark:to-green-950/20"
        : isLead
          ? "from-card to-amber-50/30 dark:to-amber-950/20"
          : "from-card to-blue-50/30 dark:to-blue-950/20";

  const handleViewDetails = () => {
    router.push(routes.contactDetail(contact.id));
  };

  return (
    <Card
      className={`hover:shadow-xl transition-all duration-300 ${cardBorderColor} bg-gradient-to-br ${cardGradient} cursor-pointer relative ${isSelected ? "ring-2 ring-green-500" : ""}`}
      onClick={handleViewDetails}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="mt-3"
            />
            <div
              className={`w-14 h-14 bg-gradient-to-br ${avatarColor} rounded-full flex items-center justify-center shadow-lg`}
            >
              <span className="text-white font-bold text-xl">
                {isCommercial && companyName
                  ? companyName.slice(0, 2).toUpperCase()
                  : `${contact.first_name?.[0] ?? ""}${contact.last_name?.[0] ?? ""}`}
              </span>
            </div>
          </div>

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

        <h3 className="text-xl font-bold text-foreground mb-1">{displayName}</h3>
        {isCommercial && companyName && (
          <p className="text-sm text-muted-foreground mb-1">{fullName}</p>
        )}
        {isCommercial && locationCount != null && locationCount > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">
              <Building2 className="w-3 h-3 mr-1" />
              {locationCount} {locationCount === 1 ? "location" : "locations"}
            </Badge>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isArchived && (
            <Badge className="text-xs bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/40 dark:text-gray-400">
              Archived
            </Badge>
          )}
          {statusBadges.length > 0 &&
            statusBadges.map((badge, idx) => (
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

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 text-green-600" />
            <span className="truncate">{contact.email || "No email"}</span>
          </div>
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 text-green-600" />
              <span>{contact.phone}</span>
            </div>
          )}
          {fullAddress && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
              <span className="line-clamp-2">{fullAddress}</span>
            </div>
          )}
        </div>

        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetails();
          }}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
