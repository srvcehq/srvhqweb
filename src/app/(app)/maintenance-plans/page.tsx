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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ClipboardList,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  Building2,
} from "lucide-react";
import { getDisplayName } from "@/lib/contact-display";
import type { Location } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
  },
  paused: {
    label: "Paused",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40",
  },
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  custom: "Custom",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function MaintenancePlansPage() {
  const { currentCompanyId } = useCompany();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Data fetching
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["maintenance-plans-all", currentCompanyId],
    queryFn: () =>
      db.MaintenancePlan.filter(
        { company_id: currentCompanyId },
        "-created_date"
      ),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-maint", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-maint"],
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams-maint"],
    queryFn: () => db.Team.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ["locations-maint", currentCompanyId],
    queryFn: () => db.Location.filter({ company_id: currentCompanyId } as Partial<Location>),
    staleTime: 5 * 60 * 1000,
  });

  // Helpers
  const getContactNameForPlan = (contactId: string, locationId?: string) => {
    const c = contacts.find((x) => x.id === contactId);
    const loc = locationId ? allLocations.find((l) => l.id === locationId) : undefined;
    return getDisplayName(c, loc);
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return null;
    const t = teams.find((x) => x.id === teamId);
    return t ? t.name : null;
  };

  // Filter & sort
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // Exclude soft-deleted
      if (plan.deleted_at) return false;

      // Status filter
      if (statusFilter !== "all" && plan.status !== statusFilter) return false;

      // Frequency filter
      if (frequencyFilter !== "all" && plan.frequency !== frequencyFilter)
        return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const contactName = getContactNameForPlan(plan.contact_id, plan.location_id).toLowerCase();
        const planTitle = (plan.title || "").toLowerCase();
        if (!contactName.includes(q) && !planTitle.includes(q)) return false;
      }

      return true;
    });
  }, [plans, statusFilter, frequencyFilter, searchQuery, contacts]);

  // Stats
  const activePlansCount = plans.filter(
    (p) => p.status === "active" && !p.deleted_at
  ).length;
  const pausedPlansCount = plans.filter(
    (p) => p.status === "paused" && !p.deleted_at
  ).length;
  const totalMonthlyRevenue = plans
    .filter((p) => p.status === "active" && !p.deleted_at)
    .reduce((sum, p) => {
      if (p.monthly_price) return sum + p.monthly_price;
      if (p.price_per_visit) {
        // Rough estimate
        if (p.frequency === "weekly") return sum + p.price_per_visit * 4;
        if (p.frequency === "biweekly") return sum + p.price_per_visit * 2;
        return sum + p.price_per_visit;
      }
      return sum;
    }, 0);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Maintenance Plans
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Manage recurring service plans and schedules
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Plan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold text-foreground">
                  {activePlansCount}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <Pause className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paused Plans</p>
                <p className="text-2xl font-bold text-foreground">
                  {pausedPlansCount}
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
                <p className="text-sm text-muted-foreground">Est. Monthly Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalMonthlyRevenue.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-lg">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                Plans
                <Badge variant="secondary">{filteredPlans.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search plans or clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-56"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={frequencyFilter}
                  onValueChange={setFrequencyFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frequencies</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {plansLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No maintenance plans found</p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Plan
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredPlans.map((plan) => {
                  const statusConfig = STATUS_CONFIG[plan.status] || STATUS_CONFIG.active;
                  const contactName = getContactNameForPlan(plan.contact_id, plan.location_id);
                  const teamName = getTeamName(plan.assigned_team_id);
                  const planContact = contacts.find((c) => c.id === plan.contact_id);
                  const isCommercialPlan = planContact?.contact_type === "commercial";
                  const servicesCount = plan.services?.filter(
                    (s) => s.included
                  ).length || 0;

                  return (
                    <div
                      key={plan.id}
                      className="p-4 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-foreground">
                              {plan.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={statusConfig.className}
                            >
                              {statusConfig.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {FREQUENCY_LABELS[plan.frequency] || plan.frequency}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              {isCommercialPlan ? <Building2 className="w-3.5 h-3.5 text-purple-500" /> : <Users className="w-3.5 h-3.5" />}
                              {contactName}
                            </span>
                            {teamName && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {teamName}
                              </span>
                            )}
                            {plan.day_of_week !== undefined && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {DAY_NAMES[plan.day_of_week]}
                              </span>
                            )}
                            <span>
                              {servicesCount} service{servicesCount !== 1 ? "s" : ""}
                            </span>
                          </div>

                          {plan.notes && (
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                              {plan.notes}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          {plan.monthly_price ? (
                            <div>
                              <div className="font-semibold text-foreground">
                                ${plan.monthly_price}
                              </div>
                              <div className="text-xs text-muted-foreground">/month</div>
                            </div>
                          ) : plan.price_per_visit ? (
                            <div>
                              <div className="font-semibold text-foreground">
                                ${plan.price_per_visit}
                              </div>
                              <div className="text-xs text-muted-foreground">/visit</div>
                            </div>
                          ) : null}
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Plan
                            </DropdownMenuItem>
                            {plan.status === "active" && (
                              <DropdownMenuItem>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause Plan
                              </DropdownMenuItem>
                            )}
                            {plan.status === "paused" && (
                              <DropdownMenuItem>
                                <Play className="w-4 h-4 mr-2" />
                                Resume Plan
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Archive Plan
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Services preview */}
                      {plan.services && plan.services.length > 0 && (
                        <div className="mt-2 ml-0 flex flex-wrap gap-1.5">
                          {plan.services
                            .filter((s) => s.included)
                            .map((service) => (
                              <span
                                key={service.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40"
                              >
                                {service.name}
                                <span className="ml-1 text-green-500">
                                  ${service.price}
                                </span>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Plan Dialog (stub) */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Maintenance Plan</DialogTitle>
              <DialogDescription>
                Set up a new recurring maintenance plan for a client. Configure
                services, frequency, and crew assignment.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 p-4 text-sm text-amber-800 dark:text-amber-400">
                The full plan creation wizard is coming soon. This will include
                client selection, service configuration, scheduling, and pricing
                setup.
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
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
