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

const CARD_PREVIEW_LIMIT = 4;

export interface OverdueItem {
  id: string;
  date: string;
  name: string;
  customer: string;
  type: "maintenance" | "project";
}

interface OverdueCardProps {
  overdueItems: OverdueItem[];
  formatOverdueDate: (dateStr: string) => string;
}

export default function OverdueCard({
  overdueItems,
  formatOverdueDate,
}: OverdueCardProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visible = overdueItems.slice(0, CARD_PREVIEW_LIMIT);
  const extraCount = overdueItems.length - CARD_PREVIEW_LIMIT;

  const handleRowClick = (item: OverdueItem) => {
    if (item.type === "maintenance") {
      router.push(`/schedule?visitId=${item.id}`);
    } else {
      router.push(`/projects?projectId=${item.id}`);
    }
  };

  const renderRow = (item: OverdueItem, idx: number, py = "py-2") => (
    <button
      key={`${item.type}-${item.id}-${idx}`}
      type="button"
      onClick={() => handleRowClick(item)}
      className={`w-full flex items-center gap-3 bg-muted rounded-lg px-4 ${py} hover:bg-accent transition-colors text-left`}
    >
      <span className="text-xs text-muted-foreground w-14 flex-shrink-0">
        {formatOverdueDate(item.date)}
      </span>
      <span className="text-sm font-medium text-foreground flex-1 truncate">
        {item.name}
      </span>
      <span className="text-sm text-muted-foreground flex-1 truncate">
        {item.customer}
      </span>
      <Badge
        variant="outline"
        className={`flex-shrink-0 ${
          item.type === "maintenance"
            ? STATUS_BADGE.orange
            : STATUS_BADGE.purple
        }`}
      >
        {item.type === "maintenance" ? "Maintenance" : "Project"}
      </Badge>
    </button>
  );

  return (
    <>
      <Card className="bg-card border border-border shadow-sm w-full">
        <div className="p-6 pb-3">
          <p className="text-sm text-foreground font-bold tracking-wide mb-2">
            Overdue Jobs
          </p>
          <div className="border-b border-border mb-4" />
          {overdueItems.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No overdue jobs</p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2">
              {visible.map((item, idx) => renderRow(item, idx))}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              All Overdue Jobs ({overdueItems.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-2">
            {overdueItems.map((item, idx) => renderRow(item, idx, "py-3"))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
