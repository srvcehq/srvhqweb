"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { formatAssignedCrew } from "@/hooks/use-employee-names";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Archive,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  FolderKanban,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Status config                                                       */
/* ------------------------------------------------------------------ */

type ProjectStatus = "draft" | "proposed" | "scheduled" | "in_progress" | "completed" | "archived";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  proposed: {
    label: "Proposed",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <ExternalLink className="w-3.5 h-3.5" />,
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  in_progress: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <Briefcase className="w-3.5 h-3.5" />,
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  archived: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400",
    icon: <Archive className="w-3.5 h-3.5" />,
  },
};

const PIPELINE_ORDER: ProjectStatus[] = [
  "draft",
  "proposed",
  "scheduled",
  "in_progress",
  "completed",
  "archived",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function parseLocalDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = parseLocalDate(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function ProjectsPage() {
  const { currentCompanyId } = useCompany();

  // State
  const [activeTab, setActiveTab] = useState("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Data fetching
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", currentCompanyId],
    queryFn: () =>
      db.Project.filter({ company_id: currentCompanyId }, "-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-proj", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  const { data: bids = [] } = useQuery({
    queryKey: ["bids-proj", currentCompanyId],
    queryFn: () => db.Bid.filter({ company_id: currentCompanyId }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-proj"],
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams-proj"],
    queryFn: () => db.Team.list(),
    staleTime: 5 * 60 * 1000,
  });

  // Helpers
  const getContactName = (contactId: string) => {
    const c = contacts.find((x) => x.id === contactId);
    return c ? `${c.first_name} ${c.last_name}` : "Unknown";
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return null;
    const t = teams.find((x) => x.id === teamId);
    return t ? t.name : null;
  };

  // Filter
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => {
      const contactName = getContactName(p.contact_id).toLowerCase();
      const title = (p.title || "").toLowerCase();
      return contactName.includes(q) || title.includes(q);
    });
  }, [projects, searchQuery, contacts]);

  // Group by status for pipeline
  const pipelineGroups = useMemo(() => {
    const groups: Record<string, typeof projects> = {};
    for (const status of PIPELINE_ORDER) {
      groups[status] = [];
    }
    for (const project of filteredProjects) {
      const status = project.status || "draft";
      if (!groups[status]) groups[status] = [];
      groups[status].push(project);
    }
    return groups;
  }, [filteredProjects]);

  // Stats
  const activeCount = projects.filter(
    (p) => p.status === "in_progress" || p.status === "scheduled"
  ).length;
  const totalValue = projects
    .filter((p) => p.status !== "archived")
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

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
          <Button
            onClick={() => setShowNewDialog(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-bold text-foreground">
                  {projects.filter((p) => p.status !== "archived").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">
                  {activeCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {projects.filter((p) => p.status === "completed").length}
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
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          {/* Pipeline View */}
          <TabsContent value="pipeline" className="mt-4">
            {isLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {PIPELINE_ORDER.map((status) => {
                  const config = STATUS_CONFIG[status];
                  const statusProjects = pipelineGroups[status] || [];

                  return (
                    <div key={status} className="space-y-3">
                      {/* Column header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={config.className}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            {statusProjects.length}
                          </span>
                        </div>
                      </div>

                      {/* Cards */}
                      <div className="space-y-2 min-h-[100px]">
                        {statusProjects.length === 0 && (
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center text-xs text-muted-foreground">
                            No projects
                          </div>
                        )}
                        {statusProjects.map((project) => {
                          const teamName = getTeamName(project.assigned_team_id);
                          return (
                            <Card
                              key={project.id}
                              className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium text-sm text-foreground leading-tight line-clamp-2">
                                    {project.title}
                                  </h4>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Eye className="w-4 h-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      {status === "draft" && (
                                        <DropdownMenuItem>
                                          <ChevronRight className="w-4 h-4 mr-2" />
                                          Mark as Proposed
                                        </DropdownMenuItem>
                                      )}
                                      {status === "proposed" && (
                                        <DropdownMenuItem>
                                          <Calendar className="w-4 h-4 mr-2" />
                                          Schedule Project
                                        </DropdownMenuItem>
                                      )}
                                      {status === "scheduled" && (
                                        <DropdownMenuItem>
                                          <Briefcase className="w-4 h-4 mr-2" />
                                          Start Work
                                        </DropdownMenuItem>
                                      )}
                                      {status === "in_progress" && (
                                        <DropdownMenuItem>
                                          <CheckCircle2 className="w-4 h-4 mr-2" />
                                          Mark Complete
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem>
                                        <Archive className="w-4 h-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                <div className="space-y-1.5">
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {getContactName(project.contact_id)}
                                  </div>

                                  {(project.scheduled_start_date ||
                                    project.scheduled_end_date) && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatShortDate(
                                        project.scheduled_start_date
                                      )}
                                      {project.scheduled_end_date &&
                                        ` - ${formatShortDate(project.scheduled_end_date)}`}
                                    </div>
                                  )}

                                  {teamName && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {teamName}
                                    </div>
                                  )}

                                  {project.total_amount && (
                                    <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      ${project.total_amount.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-4">
            <Card className="shadow-lg">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    No projects found.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                          Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                          Crew
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProjects
                        .filter((p) => p.status !== "archived")
                        .map((project) => {
                          const statusCfg =
                            STATUS_CONFIG[project.status || "draft"];
                          return (
                            <tr
                              key={project.id}
                              className="hover:bg-accent transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-4">
                                <div className="font-medium text-foreground">
                                  {project.title}
                                </div>
                                {project.description && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                                    {project.description}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">
                                {getContactName(project.contact_id)}
                              </td>
                              <td className="px-6 py-4 hidden md:table-cell">
                                <Badge
                                  variant="outline"
                                  className={statusCfg.className}
                                >
                                  {statusCfg.icon}
                                  <span className="ml-1">
                                    {statusCfg.label}
                                  </span>
                                </Badge>
                              </td>
                              <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                                {project.scheduled_start_date
                                  ? `${formatShortDate(project.scheduled_start_date)} - ${formatShortDate(project.scheduled_end_date)}`
                                  : "\u2014"}
                              </td>
                              <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                                {project.assigned_team_id
                                  ? getTeamName(project.assigned_team_id)
                                  : project.assigned_employee_ids?.length
                                    ? formatAssignedCrew(
                                        project.assigned_employee_ids,
                                        employees
                                      )
                                    : "\u2014"}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {project.total_amount ? (
                                  <span className="font-semibold text-foreground">
                                    $
                                    {project.total_amount.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    \u2014
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Project Dialog (stub) */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new project from scratch or link it to an existing bid.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 p-4 text-sm text-amber-800">
                The full project creation form is coming soon. Projects can also
                be auto-created when a bid is accepted.
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowNewDialog(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
