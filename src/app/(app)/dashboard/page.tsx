"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import SendInvoiceModal from "@/components/payments/send-invoice-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const { currentCompanyId } = useCompany();
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Get today's date in local timezone (YYYY-MM-DD format)
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const todayDate = getTodayDate();

  // Fetch maintenance visits for today
  const { data: allMaintenanceJobsToday = [] } = useQuery({
    queryKey: ["maintenanceVisitsToday", todayDate],
    queryFn: async () => {
      const allVisits = await db.MaintenanceVisit.list();
      return allVisits.filter((visit) => {
        return visit.visit_date === todayDate && visit.status !== "cancelled";
      });
    },
  });

  // Fetch contacts and employees for visit details
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => db.Contact.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => db.Employee.list(),
  });

  // Helper to get contact name by ID
  const getContactName = (contactId: string | undefined) => {
    const contact = contacts.find((c) => c.id === contactId);
    return contact
      ? `${contact.first_name} ${contact.last_name}`
      : "Unknown";
  };

  // Helper to get employee name by ID
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee
      ? employee.display_name ||
          `${employee.first_name} ${employee.last_name}`
      : "Unknown";
  };

  // Fetch accepted projects (not completed, not archived)
  const { data: allActiveProjects = [] } = useQuery({
    queryKey: ["activeProjects"],
    queryFn: async () => {
      const allProjects = await db.Project.list();
      return allProjects.filter(
        (p) =>
          p.acceptance_state === "accepted" && !p.is_completed && !p.archived
      );
    },
  });

  // Fetch overdue maintenance visits: scheduled + past date
  const { data: overdueMaintenanceVisits = [] } = useQuery({
    queryKey: ["overdueMaintenanceVisits", todayDate],
    queryFn: async () => {
      const allVisits = await db.MaintenanceVisit.list();
      return allVisits.filter(
        (visit) =>
          visit.visit_date < todayDate && visit.status === "scheduled"
      );
    },
  });

  // Fetch overdue projects: accepted, not completed, end date passed
  const { data: overdueProjects = [] } = useQuery({
    queryKey: ["overdueProjects", todayDate],
    queryFn: async () => {
      const allProjects = await db.Project.list();
      return allProjects.filter(
        (p) =>
          p.scheduled_end_date &&
          p.scheduled_end_date < todayDate &&
          !p.is_completed &&
          !p.archived
      );
    },
  });

  // Build normalized overdue items list
  const allOverdueItems = [
    ...overdueMaintenanceVisits.map((v) => ({
      date: v.visit_date,
      name: v.service_performed || "Maintenance Visit",
      customer: getContactName(v.contact_id),
      type: "maintenance" as const,
    })),
    ...overdueProjects.map((p) => ({
      date: p.scheduled_end_date!,
      name: p.title || "Project",
      customer: getContactName(p.contact_id),
      type: "project" as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const totalOverdue = allOverdueItems.length;
  const visibleOverdueItems = allOverdueItems.slice(0, 4);
  const extraOverdueCount = totalOverdue - 4;

  const formatOverdueDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Sort: unassigned first, then assigned
  const sortedMaintenanceJobsToday = [...allMaintenanceJobsToday].sort(
    (a, b) => {
      const aUnassigned =
        !a.assigned_employee_ids || a.assigned_employee_ids.length === 0;
      const bUnassigned =
        !b.assigned_employee_ids || b.assigned_employee_ids.length === 0;
      return Number(bUnassigned) - Number(aUnassigned);
    }
  );

  // Derive visible jobs and extra count
  const visibleJobs = sortedMaintenanceJobsToday.slice(0, 4);
  const extraCount = sortedMaintenanceJobsToday.length - 4;

  // Compute dashboard status for each project
  const getProjectDashboardStatus = (project: {
    scheduled_start_date?: string | null;
    scheduled_end_date?: string | null;
  }) => {
    const start = project.scheduled_start_date;
    const end = project.scheduled_end_date;
    if (!start) return "no_date";
    if (start <= todayDate && (!end || todayDate <= end)) return "in_progress";
    if (start > todayDate) return "upcoming";
    return "upcoming"; // fallback: past start, no end
  };

  const sortedActiveProjects = [...allActiveProjects]
    .map((p) => {
      const dashboardStatus = getProjectDashboardStatus(p);
      const sortRank =
        dashboardStatus === "in_progress"
          ? 0
          : dashboardStatus === "upcoming"
            ? 1
            : 2;
      return { ...p, dashboardStatus, sortRank };
    })
    .sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      if (
        a.dashboardStatus === "upcoming" &&
        b.dashboardStatus === "upcoming"
      ) {
        return (a.scheduled_start_date || "").localeCompare(
          b.scheduled_start_date || ""
        );
      }
      return 0;
    });

  const projectStatusPill = (status: string) => {
    if (status === "in_progress")
      return {
        label: "In Progress",
        className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
      };
    if (status === "upcoming")
      return {
        label: "Upcoming",
        className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40",
      };
    return {
      label: "No Date",
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/40",
    };
  };

  // Derive visible projects and extra count
  const visibleProjects = sortedActiveProjects.slice(0, 4);
  const extraProjectCount = sortedActiveProjects.length - 4;

  // Fetch payments for last 7 days
  const { data: recentPayments = [] } = useQuery({
    queryKey: ["recentPayments"],
    queryFn: () => db.Payment.list(),
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const succeededPaymentsLast7 = recentPayments
    .filter(
      (p) =>
        p.status === "succeeded" &&
        p.created_date &&
        new Date(p.created_date) >= sevenDaysAgo
    )
    .sort(
      (a, b) =>
        new Date(b.created_date).getTime() -
        new Date(a.created_date).getTime()
    );

  const successfulPaymentsTotal = succeededPaymentsLast7.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const visiblePayments = succeededPaymentsLast7.slice(0, 4);
  const extraPaymentCount = succeededPaymentsLast7.length - 4;

  const formatPaymentAmount = (amount: number) =>
    `$${(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      succeeded: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
      unpaid: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40",
      processing: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40",
      failed: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40",
    };
    const labels: Record<string, string> = {
      succeeded: "Succeeded",
      unpaid: "Unpaid",
      processing: "Unpaid",
      failed: "Failed",
    };
    return (
      <Badge
        variant="outline"
        className={
          styles[status] || "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700"
        }
      >
        {labels[status] || status}
      </Badge>
    );
  };

  const unpaidPayments = recentPayments
    .filter((p) => ["unpaid", "processing", "failed"].includes(p.status))
    .sort(
      (a, b) =>
        new Date(b.created_date).getTime() -
        new Date(a.created_date).getTime()
    );

  const unpaidTotal = unpaidPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const visibleUnpaid = unpaidPayments.slice(0, 4);
  const extraUnpaidCount = unpaidPayments.length - 4;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! Here&apos;s what&apos;s happening today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={routes.contacts}>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Client
              </Button>
            </Link>
            <Button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
            <Link href={routes.bids}>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Bid
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Maintenance Jobs Today */}
          <Card className="bg-card border border-border shadow-sm min-h-48">
            <div className="p-6 pb-3 flex flex-col h-full">
              <p className="text-sm text-foreground font-bold tracking-wide mb-2">
                Maintenance Jobs Today
              </p>
              <div className="border-b border-border mb-4" />
              {allMaintenanceJobsToday.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    No maintenance jobs today
                  </p>
                </div>
              ) : (
                <div className="flex flex-col space-y-2.5">
                  {visibleJobs.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between bg-muted rounded-lg px-4 py-2"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {getContactName(visit.contact_id)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`flex-shrink-0 ml-3 ${
                          (visit.assigned_employee_ids?.length ?? 0) > 0
                            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40"
                            : "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40"
                        }`}
                      >
                        {(visit.assigned_employee_ids?.length ?? 0) > 0
                          ? getEmployeeName(visit.assigned_employee_ids![0])
                          : "Unassigned"}
                      </Badge>
                    </div>
                  ))}
                  {extraCount > 0 && (
                    <button
                      onClick={() => setIsMaintenanceModalOpen(true)}
                      className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      +{extraCount} more
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Card 2: Active Projects */}
          <Card className="bg-card border border-border shadow-sm min-h-48">
            <div className="p-6 pb-3 flex flex-col h-full">
              <p className="text-sm text-foreground font-bold tracking-wide mb-2">
                Active Projects
              </p>
              <div className="border-b border-border mb-4" />
              {sortedActiveProjects.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No active projects</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-2.5">
                  {visibleProjects.map((project) => {
                    const pill = projectStatusPill(project.dashboardStatus);
                    return (
                      <div
                        key={project.id}
                        className="flex items-center justify-between bg-muted rounded-lg px-4 py-2"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {getContactName(project.contact_id)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`flex-shrink-0 ml-3 ${pill.className}`}
                        >
                          {pill.label}
                        </Badge>
                      </div>
                    );
                  })}
                  {extraProjectCount > 0 && (
                    <button
                      onClick={() => setIsProjectsModalOpen(true)}
                      className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      +{extraProjectCount} more
                    </button>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Overdue Jobs */}
        <Card className="bg-card border border-border shadow-sm w-full">
          <div className="p-6 pb-3">
            <p className="text-sm text-foreground font-bold tracking-wide mb-2">
              Overdue Jobs
            </p>
            <div className="border-b border-border mb-4" />
            {totalOverdue === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No overdue jobs</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-2">
                {visibleOverdueItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-muted rounded-lg px-4 py-2"
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
                          ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/40"
                          : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/40"
                      }`}
                    >
                      {item.type === "maintenance" ? "Maintenance" : "Project"}
                    </Badge>
                  </div>
                ))}
                {extraOverdueCount > 0 && (
                  <button
                    onClick={() => setIsOverdueModalOpen(true)}
                    className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    +{extraOverdueCount} more
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Money Section */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Money</h2>

          {/* 2-Card Grid - Desktop: 2 columns, Tablet: 2 columns, Mobile: 1 column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Payments in Last 7 Days */}
            <Card className="bg-card border border-border shadow-sm min-h-48">
              <div className="p-6 pb-3 flex flex-col h-full">
                <p className="text-sm text-foreground font-bold tracking-wide mb-2">
                  Payments in the Last 7 Days
                </p>
                <div className="border-b border-border mb-4" />
                <p className="text-4xl font-bold text-green-600 mb-4">
                  $
                  {successfulPaymentsTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </p>
                {succeededPaymentsLast7.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      No payments in the last 7 days
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2.5">
                    {visiblePayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between bg-muted rounded-lg px-4 py-2 gap-3"
                      >
                        <p className="text-sm font-medium text-foreground truncate flex-1">
                          {getContactName(payment.contact_id)}
                        </p>
                        <span className="text-sm font-semibold text-green-700 flex-shrink-0">
                          {formatPaymentAmount(payment.amount)}
                        </span>
                        <div className="flex-shrink-0">
                          {getPaymentStatusBadge(payment.status)}
                        </div>
                      </div>
                    ))}
                    {extraPaymentCount > 0 && (
                      <button
                        onClick={() => setIsPaymentsModalOpen(true)}
                        className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        +{extraPaymentCount} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Card 2: Unpaid Payments */}
            <Card className="bg-card border border-border shadow-sm min-h-48">
              <div className="p-6 pb-3 flex flex-col h-full">
                <p className="text-sm text-foreground font-bold tracking-wide mb-2">
                  Unpaid Payments
                </p>
                <div className="border-b border-border mb-4" />
                <p className="text-4xl font-bold text-foreground mb-4">
                  {formatPaymentAmount(unpaidTotal)}
                </p>
                {unpaidPayments.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">No unpaid payments</p>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2.5">
                    {visibleUnpaid.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between bg-muted rounded-lg px-4 py-2 gap-3"
                      >
                        <p className="text-sm font-medium text-foreground truncate flex-1">
                          {getContactName(payment.contact_id)}
                        </p>
                        <span className="text-sm font-semibold text-foreground flex-shrink-0">
                          {formatPaymentAmount(payment.amount)}
                        </span>
                        <div className="flex-shrink-0">
                          {getPaymentStatusBadge(payment.status)}
                        </div>
                      </div>
                    ))}
                    {extraUnpaidCount > 0 && (
                      <button
                        onClick={() => setIsUnpaidModalOpen(true)}
                        className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        +{extraUnpaidCount} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Active Projects Modal */}
        <Dialog open={isProjectsModalOpen} onOpenChange={setIsProjectsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Active Projects</DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
              {sortedActiveProjects.map((project) => {
                const pill = projectStatusPill(project.dashboardStatus);
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between bg-muted rounded-lg px-4 py-3"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {getContactName(project.contact_id)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`flex-shrink-0 ml-3 ${pill.className}`}
                    >
                      {pill.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Overdue Jobs Modal */}
        <Dialog open={isOverdueModalOpen} onOpenChange={setIsOverdueModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>All Overdue Jobs ({totalOverdue})</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-2">
              {allOverdueItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-muted rounded-lg px-4 py-3"
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
                        ? "bg-orange-100 text-orange-700 border-orange-200"
                        : "bg-purple-100 text-purple-700 border-purple-200"
                    }`}
                  >
                    {item.type === "maintenance" ? "Maintenance" : "Project"}
                  </Badge>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Unpaid Payments Modal */}
        <Dialog open={isUnpaidModalOpen} onOpenChange={setIsUnpaidModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Unpaid Payments ({unpaidPayments.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
              {unpaidPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between bg-muted rounded-lg px-4 py-3 gap-3"
                >
                  <p className="text-sm font-medium text-foreground truncate flex-1">
                    {getContactName(payment.contact_id)}
                  </p>
                  <span className="text-sm font-semibold text-foreground flex-shrink-0">
                    {formatPaymentAmount(payment.amount)}
                  </span>
                  <div className="flex-shrink-0">
                    {getPaymentStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Payments Modal */}
        <Dialog
          open={isPaymentsModalOpen}
          onOpenChange={setIsPaymentsModalOpen}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Payments in the Last 7 Days (
                {succeededPaymentsLast7.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
              {succeededPaymentsLast7.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between bg-muted rounded-lg px-4 py-3 gap-3"
                >
                  <p className="text-sm font-medium text-foreground truncate flex-1">
                    {getContactName(payment.contact_id)}
                  </p>
                  <span className="text-sm font-semibold text-green-700 flex-shrink-0">
                    {formatPaymentAmount(payment.amount)}
                  </span>
                  <div className="flex-shrink-0">
                    {getPaymentStatusBadge(payment.status)}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Maintenance Jobs Modal */}
        <Dialog
          open={isMaintenanceModalOpen}
          onOpenChange={setIsMaintenanceModalOpen}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Maintenance Jobs Today</DialogTitle>
            </DialogHeader>
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
              {sortedMaintenanceJobsToday.map((visit) => (
                <div
                  key={visit.id}
                  className="flex items-center justify-between bg-muted rounded-lg px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {getContactName(visit.contact_id)}
                  </p>
                  <Badge
                    variant="outline"
                    className={`flex-shrink-0 ml-3 ${
                      (visit.assigned_employee_ids?.length ?? 0) > 0
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-yellow-100 text-yellow-700 border-yellow-200"
                    }`}
                  >
                    {(visit.assigned_employee_ids?.length ?? 0) > 0
                      ? getEmployeeName(visit.assigned_employee_ids![0])
                      : "Unassigned"}
                  </Badge>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <SendInvoiceModal
          open={isInvoiceModalOpen}
          onOpenChange={setIsInvoiceModalOpen}
          currentCompanyId={currentCompanyId}
        />
      </div>
    </div>
  );
}
