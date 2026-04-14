"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { findContactName } from "@/lib/contact-display";
import { useCompany } from "@/providers/company-provider";
import { formatAssignedCrew } from "@/hooks/use-employee-names";
import {
  archiveProjectWithBid,
  unarchiveProjectWithBid,
} from "@/lib/bid-project-sync";
import { syncProjectScheduleBlocks } from "@/lib/sync-project-schedule-blocks";
import { toast } from "sonner";
import { todayStr, formatShortDateNoYear as formatShortDate } from "@/lib/format-helpers";
import { queryKeys } from "@/lib/query-keys";
import type { Project, Bid } from "@/data/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Archive,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FolderKanban,
  Loader2,
  MoreVertical,
  Search,
  Users,
  Undo2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function addWorkingDays(
  startStr: string,
  days: number,
  workDays: string[]
): string {
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const indices = workDays.map((d) => dayMap[d]);
  const [y, m, d] = startStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  let count = 0;
  while (count < days - 1) {
    date.setDate(date.getDate() + 1);
    if (indices.includes(date.getDay())) count++;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Tab classification                                                  */
/* ------------------------------------------------------------------ */

type ProjectTab =
  | "current"
  | "upcoming"
  | "accepted_no_date"
  | "not_accepted"
  | "all"
  | "archived";

function classifyProject(
  project: Project,
  today: string
): ProjectTab {
  if (project.archived_at) return "archived";

  // Not accepted yet
  if (
    project.acceptance_state === "pending" ||
    (!project.acceptance_state && !project.is_completed && project.status !== "completed")
  ) {
    return "not_accepted";
  }

  // Completed
  if (project.is_completed || project.status === "completed") return "current"; // show completed in "all" only

  // Accepted but no dates
  if (
    (project.acceptance_state === "accepted") &&
    !project.scheduled_start_date
  ) {
    return "accepted_no_date";
  }

  // Has dates
  if (project.scheduled_start_date) {
    if (project.scheduled_start_date > today) return "upcoming";
    return "current";
  }

  return "not_accepted";
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProjectsPage() {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const router = useRouter();
  const today = todayStr();

  // Tab + search
  const [activeTab, setActiveTab] = useState<ProjectTab>("current");
  const [searchQuery, setSearchQuery] = useState("");

  // Accept modal
  const [acceptingProject, setAcceptingProject] = useState<Project | null>(null);

  // Schedule modal
  const [schedulingProject, setSchedulingProject] = useState<Project | null>(null);
  const [schedStartDate, setSchedStartDate] = useState("");
  const [schedDuration, setSchedDuration] = useState("5");
  const [schedWorkDays, setSchedWorkDays] = useState<Record<string, boolean>>({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false,
  });
  const [schedTeamId, setSchedTeamId] = useState("");

  // Mark complete modal
  const [completingProject, setCompletingProject] = useState<Project | null>(null);

  // Data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: queryKeys.projects(currentCompanyId),
    queryFn: () =>
      db.Project.filter({ company_id: currentCompanyId }, "-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: queryKeys.contacts(currentCompanyId),
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  const { data: bids = [] } = useQuery({
    queryKey: queryKeys.bids(currentCompanyId),
    queryFn: () => db.Bid.filter({ company_id: currentCompanyId }),
  });

  const { data: teams = [] } = useQuery({
    queryKey: queryKeys.teams(),
    queryFn: () => db.Team.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: queryKeys.employees(),
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const getContactName = (contactId: string) =>
    findContactName(contacts, contactId);
  const getTeamName = (teamId?: string) =>
    teamId ? teams.find((t) => t.id === teamId)?.name || null : null;
  const getBidForProject = (project: Project): Bid | undefined =>
    bids.find((b) => b.id === project.bid_id || b.project_id === project.id);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects(currentCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.bids(currentCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.scheduleBlocks(currentCompanyId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.payments(currentCompanyId) });
  };

  // --- Accept flow ---
  const handleAcceptNoDate = async () => {
    if (!acceptingProject) return;
    await db.Project.update(acceptingProject.id, {
      acceptance_state: "accepted",
      status: "proposed",
    });
    const bid = getBidForProject(acceptingProject);
    if (bid) {
      await db.Bid.update(bid.id, {
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });
    }
    invalidateAll();
    toast.success("Project accepted.");
    setAcceptingProject(null);
  };

  const handleAcceptWithDates = () => {
    if (!acceptingProject) return;
    setSchedulingProject(acceptingProject);
    setSchedStartDate("");
    setSchedDuration("5");
    setSchedTeamId("");
    setAcceptingProject(null);
  };

  // --- Schedule flow ---
  const handleSchedule = async () => {
    if (!schedulingProject || !schedStartDate) return;

    const workDayKeys = Object.entries(schedWorkDays)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const duration = parseInt(schedDuration) || 5;
    const endDate = addWorkingDays(schedStartDate, duration, workDayKeys);

    // Update project
    await db.Project.update(schedulingProject.id, {
      acceptance_state: "accepted",
      status: "scheduled",
      scheduled_start_date: schedStartDate,
      scheduled_end_date: endDate,
      duration_days: duration,
      assigned_team_id: schedTeamId || undefined,
    });

    // Update linked bid
    const bid = getBidForProject(schedulingProject);
    if (bid && bid.status !== "accepted") {
      await db.Bid.update(bid.id, {
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });
    }

    // Create schedule blocks
    await syncProjectScheduleBlocks({
      projectId: schedulingProject.id,
      startDate: schedStartDate,
      endDate,
      assignedTeamIds: schedTeamId ? [schedTeamId] : [],
      selectedWorkDays: workDayKeys,
    });

    invalidateAll();
    toast.success("Project scheduled. Schedule blocks created.");
    setSchedulingProject(null);
  };

  // --- Mark complete ---
  const handleMarkComplete = async () => {
    if (!completingProject) return;

    await db.Project.update(completingProject.id, {
      status: "completed",
      is_completed: true,
    });

    // Create final payment if project has a value
    const amount = completingProject.total_amount;
    if (amount && amount > 0) {
      // Subtract deposits already paid
      const existingPayments = await db.Payment.filter({
        company_id: currentCompanyId,
        project_id: completingProject.id,
      });
      const paidSoFar = existingPayments
        .filter((p) => p.status === "succeeded")
        .reduce((s, p) => s + (p.amount || 0), 0);
      const remaining = amount - paidSoFar;

      if (remaining > 0) {
        await db.Payment.create({
          company_id: currentCompanyId,
          contact_id: completingProject.contact_id,
          project_id: completingProject.id,
          type: "final",
          amount: remaining,
          status: "unpaid",
          description: `Final payment — ${completingProject.title}`,
          due_date: todayStr(),
        });
        toast.success(
          `Project completed. Final payment of $${remaining.toLocaleString()} created.`
        );
      } else {
        toast.success("Project completed. Fully paid.");
      }
    } else {
      toast.success("Project completed.");
    }

    invalidateAll();
    setCompletingProject(null);
  };

  // --- Archive ---
  const handleArchive = async (project: Project) => {
    await archiveProjectWithBid(project, bids);
    invalidateAll();
    toast.success(`Archived "${project.title}"`);
  };

  const handleUnarchive = async (project: Project) => {
    await unarchiveProjectWithBid(project, bids);
    invalidateAll();
    toast.success(`Restored "${project.title}"`);
  };

  // --- Filter + classify ---
  const filtered = useMemo(() => {
    let result = projects;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          getContactName(p.contact_id).toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, searchQuery, contacts]);

  const tabCounts = useMemo(() => {
    const counts: Record<ProjectTab, number> = {
      current: 0, upcoming: 0, accepted_no_date: 0, not_accepted: 0, all: 0, archived: 0,
    };
    for (const p of projects) {
      const tab = classifyProject(p, today);
      counts[tab]++;
      if (tab !== "archived") counts.all++;
    }
    // Also count completed in "all"
    return counts;
  }, [projects, today]);

  const tabProjects = useMemo(() => {
    if (activeTab === "all") return filtered.filter((p) => !p.archived_at);
    if (activeTab === "archived") return filtered.filter((p) => !!p.archived_at);
    return filtered.filter((p) => classifyProject(p, today) === activeTab);
  }, [filtered, activeTab, today]);

  // Stats
  const acceptedValue = projects
    .filter(
      (p) =>
        (p.acceptance_state === "accepted" || p.status === "completed") &&
        !p.archived_at
    )
    .reduce((s, p) => s + (p.total_amount || 0), 0);

  // --- Render helpers ---
  const renderProjectRow = (project: Project) => {
    const bid = getBidForProject(project);
    const teamName = getTeamName(project.assigned_team_id);
    const isOverdue =
      project.scheduled_end_date &&
      project.scheduled_end_date < today &&
      !project.is_completed &&
      !project.archived_at;

    return (
      <div
        key={project.id}
        className="p-4 hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
      >
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-foreground">
                {project.title}
              </span>
              {project.is_completed && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                >
                  Completed
                </Badge>
              )}
              {isOverdue && (
                <Badge
                  variant="outline"
                  className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                >
                  Overdue
                </Badge>
              )}
              {project.status === "scheduled" &&
                !project.is_completed &&
                !isOverdue && (
                  <Badge
                    variant="outline"
                    className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
                  >
                    Scheduled
                  </Badge>
                )}
              {project.status === "in_progress" && !project.is_completed && (
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  In Progress
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>{getContactName(project.contact_id)}</span>
              {teamName && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {teamName}
                </span>
              )}
              {project.scheduled_start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatShortDate(project.scheduled_start_date)}
                  {project.scheduled_end_date &&
                    ` \u2013 ${formatShortDate(project.scheduled_end_date)}`}
                </span>
              )}
              {project.total_amount && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />$
                  {project.total_amount.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Accept — only for not_accepted */}
              {project.acceptance_state === "pending" && (
                <DropdownMenuItem
                  onClick={() => setAcceptingProject(project)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Project
                </DropdownMenuItem>
              )}

              {/* Choose Dates — for accepted_no_date */}
              {project.acceptance_state === "accepted" &&
                !project.scheduled_start_date &&
                !project.is_completed && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSchedulingProject(project);
                      setSchedStartDate("");
                      setSchedDuration("5");
                      setSchedTeamId("");
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Choose Dates
                  </DropdownMenuItem>
                )}

              {/* Mark Complete — for scheduled/in_progress */}
              {(project.status === "scheduled" ||
                project.status === "in_progress") &&
                !project.is_completed && (
                  <DropdownMenuItem
                    onClick={() => setCompletingProject(project)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                )}

              {/* View Bid */}
              {bid && (
                <DropdownMenuItem
                  onClick={() => router.push(`/bids`)}
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  View Bid
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* Archive / Unarchive */}
              {project.archived_at ? (
                <DropdownMenuItem onClick={() => handleUnarchive(project)}>
                  <Undo2 className="w-4 h-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleArchive(project)}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Projects
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Track and manage your project pipeline
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="text-2xl font-bold">{tabCounts.current}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{tabCounts.upcoming}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">No Date</p>
                <p className="text-2xl font-bold">
                  {tabCounts.accepted_no_date}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Not Accepted</p>
                <p className="text-2xl font-bold">
                  {tabCounts.not_accepted}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepted Value</p>
                <p className="text-2xl font-bold">
                  ${acceptedValue.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Tabs */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ProjectTab)}
        >
          <TabsList className="grid w-full grid-cols-6 bg-card border shadow-sm">
            {(
              [
                ["current", "Current"],
                ["upcoming", "Upcoming"],
                ["accepted_no_date", "No Date"],
                ["not_accepted", "Not Accepted"],
                ["all", "All"],
                ["archived", "Archived"],
              ] as const
            ).map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
              >
                {label}
                {tabCounts[value] > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 text-[10px]">
                    {tabCounts[value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* All tabs share the same content renderer */}
          {(
            [
              "current",
              "upcoming",
              "accepted_no_date",
              "not_accepted",
              "all",
              "archived",
            ] as const
          ).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card className="shadow-lg">
                <CardContent className="p-0">
                  {tabProjects.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <FolderKanban className="w-12 h-12 mx-auto mb-4" />
                      <p className="font-medium">No projects here</p>
                    </div>
                  ) : (
                    tabProjects.map(renderProjectRow)
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ============ Accept Modal ============ */}
      <Dialog
        open={!!acceptingProject}
        onOpenChange={(open) => !open && setAcceptingProject(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Accept Project
            </DialogTitle>
          </DialogHeader>
          {acceptingProject && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Accept &quot;{acceptingProject.title}&quot; and update the
                linked bid status.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  className="rounded-xl border-2 border-border p-4 text-center hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
                  onClick={handleAcceptNoDate}
                >
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium text-sm">Accept</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No dates yet
                  </p>
                </button>
                <button
                  className="rounded-xl border-2 border-border p-4 text-center hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors"
                  onClick={handleAcceptWithDates}
                >
                  <Calendar className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-medium text-sm">Accept & Schedule</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose dates now
                  </p>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAcceptingProject(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Schedule Modal ============ */}
      <Dialog
        open={!!schedulingProject}
        onOpenChange={(open) => !open && setSchedulingProject(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Schedule Project
            </DialogTitle>
          </DialogHeader>
          {schedulingProject && (
            <div className="space-y-5 mt-2">
              <p className="text-sm text-muted-foreground">
                {schedulingProject.title}
              </p>

              {/* Bid labor estimate (read-only) */}
              {(() => {
                const bid = getBidForProject(schedulingProject);
                if (!bid) return null;
                return (
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                      Labor Estimate (from bid)
                    </p>
                    {bid.labor_hours_per_day && (
                      <p>Hours/day: {bid.labor_hours_per_day}</p>
                    )}
                    {bid.labor_estimate_total && (
                      <p>
                        Total labor: $
                        {bid.labor_estimate_total.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Crew */}
              <div className="space-y-2">
                <Label>Assigned Team</Label>
                <Select value={schedTeamId} onValueChange={setSchedTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Work days */}
              <div className="space-y-2">
                <Label>Work Days</Label>
                <div className="flex gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <button
                        key={day}
                        onClick={() =>
                          setSchedWorkDays((prev) => ({
                            ...prev,
                            [day]: !prev[day],
                          }))
                        }
                        className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                          schedWorkDays[day]
                            ? "bg-green-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {day}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={schedStartDate}
                    onChange={(e) => setSchedStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (working days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={schedDuration}
                    onChange={(e) => setSchedDuration(e.target.value)}
                  />
                </div>
              </div>

              {schedStartDate && (
                <p className="text-xs text-muted-foreground">
                  End date:{" "}
                  {formatShortDate(
                    addWorkingDays(
                      schedStartDate,
                      parseInt(schedDuration) || 1,
                      Object.entries(schedWorkDays)
                        .filter(([, v]) => v)
                        .map(([k]) => k)
                    )
                  )}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSchedulingProject(null)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!schedStartDate}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                  onClick={handleSchedule}
                >
                  Assign & Schedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Mark Complete Modal ============ */}
      <Dialog
        open={!!completingProject}
        onOpenChange={(open) => !open && setCompletingProject(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Mark Complete
            </DialogTitle>
          </DialogHeader>
          {completingProject && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Complete &quot;{completingProject.title}&quot; and generate the
                final payment.
              </p>

              {completingProject.total_amount && (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Project Value
                  </p>
                  <p className="text-2xl font-bold">
                    ${completingProject.total_amount.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCompletingProject(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                  onClick={handleMarkComplete}
                >
                  Complete & Create Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
