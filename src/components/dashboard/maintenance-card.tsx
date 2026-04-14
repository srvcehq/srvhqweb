"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_BADGE } from "@/lib/status-styles";
import type { MaintenanceVisit } from "@/data/types";

const CARD_PREVIEW_LIMIT = 4;

type VisitOpStatus = "unassigned" | "overdue" | "scheduled";

function getVisitOpStatus(visit: MaintenanceVisit): VisitOpStatus {
  const isUnassigned =
    !visit.assigned_employee_ids || visit.assigned_employee_ids.length === 0;
  if (isUnassigned) return "unassigned";

  // If the visit has a start_time and it's already past, it's overdue
  if (visit.start_time) {
    const now = new Date();
    const [hours, minutes] = visit.start_time.split(":").map(Number);
    const visitTime = new Date();
    visitTime.setHours(hours, minutes, 0, 0);
    if (now > visitTime && visit.status === "scheduled") return "overdue";
  }

  return "scheduled";
}

const OP_STATUS_SORT: Record<VisitOpStatus, number> = {
  unassigned: 0,
  overdue: 1,
  scheduled: 2,
};

const OP_STATUS_BADGE: Record<VisitOpStatus, { label: string; className: string }> = {
  unassigned: { label: "Unassigned", className: STATUS_BADGE.yellow },
  overdue: { label: "Overdue", className: STATUS_BADGE.red },
  scheduled: { label: "Scheduled", className: STATUS_BADGE.green },
};

interface MaintenanceCardProps {
  visits: MaintenanceVisit[];
  getContactName: (id: string | undefined) => string;
  getEmployeeName: (id: string) => string;
}

export default function MaintenanceCard({
  visits,
  getContactName,
  getEmployeeName,
}: MaintenanceCardProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sorted = [...visits]
    .map((v) => ({ ...v, _opStatus: getVisitOpStatus(v) }))
    .sort((a, b) => {
      // Sort by operational status first
      const rankDiff = OP_STATUS_SORT[a._opStatus] - OP_STATUS_SORT[b._opStatus];
      if (rankDiff !== 0) return rankDiff;
      // Within same status, sort by time ascending
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

  const visible = sorted.slice(0, CARD_PREVIEW_LIMIT);
  const extraCount = sorted.length - CARD_PREVIEW_LIMIT;

  const handleRowClick = (visit: MaintenanceVisit) => {
    router.push(`/schedule?visitId=${visit.id}`);
  };

  const renderRow = (
    visit: (typeof sorted)[number],
    py = "py-2"
  ) => {
    const badge = OP_STATUS_BADGE[visit._opStatus];
    const assigneeName =
      visit._opStatus !== "unassigned" && visit.assigned_employee_ids?.[0]
        ? getEmployeeName(visit.assigned_employee_ids[0])
        : null;

    return (
      <button
        key={visit.id}
        type="button"
        onClick={() => handleRowClick(visit)}
        className={`w-full flex items-center justify-between bg-muted rounded-lg px-4 ${py} hover:bg-accent transition-colors text-left`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {getContactName(visit.contact_id)}
          </p>
          {assigneeName && (
            <p className="text-xs text-muted-foreground truncate">
              {assigneeName}
            </p>
          )}
        </div>
        <Badge
          variant="outline"
          className={`flex-shrink-0 ml-3 ${badge.className}`}
        >
          {badge.label}
        </Badge>
      </button>
    );
  };

  return (
    <>
      <Card className="bg-card border border-border shadow-sm min-h-48">
        <div className="p-6 pb-3 flex flex-col h-full">
          <p className="text-sm text-foreground font-bold tracking-wide mb-2">
            Maintenance Jobs Today
          </p>
          <div className="border-b border-border mb-4" />
          {visits.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No maintenance jobs today
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2.5">
              {visible.map((visit) => renderRow(visit))}
              {extraCount > 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  +{extraCount} more
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Maintenance Jobs Today</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
            {sorted.map((visit) => renderRow(visit, "py-3"))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
