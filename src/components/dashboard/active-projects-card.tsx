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
import type { Project } from "@/data/types";

const CARD_PREVIEW_LIMIT = 4;

interface ProjectWithStatus extends Project {
  dashboardStatus: string;
  sortRank: number;
}

interface ActiveProjectsCardProps {
  projects: ProjectWithStatus[];
  getContactName: (id: string | undefined) => string;
  projectStatusPill: (status: string) => { label: string; className: string };
}

export default function ActiveProjectsCard({
  projects,
  getContactName,
  projectStatusPill,
}: ActiveProjectsCardProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visible = projects.slice(0, CARD_PREVIEW_LIMIT);
  const extraCount = projects.length - CARD_PREVIEW_LIMIT;

  const handleRowClick = (project: ProjectWithStatus) => {
    router.push(`/projects?projectId=${project.id}`);
  };

  const renderRow = (
    project: ProjectWithStatus,
    py = "py-2"
  ) => {
    const pill = projectStatusPill(project.dashboardStatus);
    return (
      <button
        key={project.id}
        type="button"
        onClick={() => handleRowClick(project)}
        className={`w-full flex items-center justify-between bg-muted rounded-lg px-4 ${py} hover:bg-accent transition-colors text-left`}
      >
        <p className="text-sm font-medium text-foreground truncate">
          {getContactName(project.contact_id)}
        </p>
        <Badge
          variant="outline"
          className={`flex-shrink-0 ml-3 ${pill.className}`}
        >
          {pill.label}
        </Badge>
      </button>
    );
  };

  return (
    <>
      <Card className="bg-card border border-border shadow-sm min-h-48">
        <div className="p-6 pb-3 flex flex-col h-full">
          <p className="text-sm text-foreground font-bold tracking-wide mb-2">
            Active Projects
          </p>
          <div className="border-b border-border mb-4" />
          {projects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No active projects
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2.5">
              {visible.map((project) => renderRow(project))}
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
            <DialogTitle>Active Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
            {projects.map((project) => renderRow(project, "py-3"))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
