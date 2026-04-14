"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import SendInvoiceModal from "@/components/payments/send-invoice-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { findContactName, findEmployeeName } from "@/lib/contact-display";
import { STATUS_BADGE } from "@/lib/status-styles";
import MaintenanceCard from "@/components/dashboard/maintenance-card";
import ActiveProjectsCard from "@/components/dashboard/active-projects-card";
import OverdueCard from "@/components/dashboard/overdue-card";
import PaymentsCard from "@/components/dashboard/payments-card";

export default function Dashboard() {
  const { currentCompanyId } = useCompany();
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

  const getContactName = (contactId: string | undefined) =>
    findContactName(contacts, contactId);
  const getEmployeeName = (employeeId: string) =>
    findEmployeeName(employees, employeeId);

  // Fetch accepted projects (not completed, not archived)
  const { data: allActiveProjects = [] } = useQuery({
    queryKey: ["activeProjects"],
    queryFn: async () => {
      const allProjects = await db.Project.list();
      return allProjects.filter(
        (p) =>
          p.acceptance_state === "accepted" && !p.is_completed && !p.archived_at
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

  // Fetch overdue projects: accepted, not completed, end date passed (yesterday or earlier)
  const { data: overdueProjects = [] } = useQuery({
    queryKey: ["overdueProjects", todayDate],
    queryFn: async () => {
      const allProjects = await db.Project.list();
      return allProjects.filter(
        (p) =>
          p.acceptance_state === "accepted" &&
          p.scheduled_end_date &&
          p.scheduled_end_date < todayDate &&
          !p.is_completed &&
          !p.archived_at
      );
    },
  });

  // Build normalized overdue items list
  const allOverdueItems = [
    ...overdueMaintenanceVisits.map((v) => ({
      id: v.id,
      date: v.visit_date,
      name: v.service_performed || "Maintenance Visit",
      customer: getContactName(v.contact_id),
      type: "maintenance" as const,
    })),
    ...overdueProjects.map((p) => ({
      id: p.id,
      date: p.scheduled_end_date!,
      name: p.title || "Project",
      customer: getContactName(p.contact_id),
      type: "project" as const,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const formatOverdueDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Compute dashboard status for each project
  const getProjectDashboardStatus = (project: {
    scheduled_start_date?: string | null;
    scheduled_end_date?: string | null;
  }) => {
    const start = project.scheduled_start_date;
    const end = project.scheduled_end_date;
    if (!start) return "no_date";
    // Past end date = overdue
    if (end && end < todayDate) return "overdue";
    if (start <= todayDate && (!end || todayDate <= end)) return "in_progress";
    if (start > todayDate) return "upcoming";
    return "in_progress"; // fallback: past start, no end
  };

  const PROJ_SORT_RANK: Record<string, number> = {
    overdue: 0,
    in_progress: 1,
    upcoming: 2,
    no_date: 3,
  };

  const sortedActiveProjects = [...allActiveProjects]
    .map((p) => {
      const dashboardStatus = getProjectDashboardStatus(p);
      const sortRank = PROJ_SORT_RANK[dashboardStatus] ?? 3;
      return { ...p, dashboardStatus, sortRank };
    })
    .sort((a, b) => {
      if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
      if (a.dashboardStatus === "upcoming" && b.dashboardStatus === "upcoming") {
        return (a.scheduled_start_date || "").localeCompare(
          b.scheduled_start_date || ""
        );
      }
      return 0;
    });

  const projectStatusPill = (status: string) => {
    if (status === "overdue")
      return { label: "Overdue", className: STATUS_BADGE.red };
    if (status === "in_progress")
      return { label: "Active", className: STATUS_BADGE.green };
    if (status === "upcoming")
      return { label: "Upcoming", className: STATUS_BADGE.blue };
    return { label: "No Date", className: STATUS_BADGE.amber };
  };

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

  const formatPaymentAmount = (amount: number) =>
    `$${(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      succeeded: STATUS_BADGE.green,
      unpaid: STATUS_BADGE.yellow,
      processing: STATUS_BADGE.gray,
      failed: STATUS_BADGE.red,
    };
    const labels: Record<string, string> = {
      succeeded: "Succeeded",
      unpaid: "Unpaid",
      processing: "Processing",
      failed: "Failed",
    };
    return (
      <Badge
        variant="outline"
        className={styles[status] || STATUS_BADGE.gray}
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
            <Link href={`${routes.contacts}?create=true`}>
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
          <MaintenanceCard
            visits={allMaintenanceJobsToday}
            getContactName={getContactName}
            getEmployeeName={getEmployeeName}
          />
          <ActiveProjectsCard
            projects={sortedActiveProjects}
            getContactName={getContactName}
            projectStatusPill={projectStatusPill}
          />
        </div>

        <OverdueCard
          overdueItems={allOverdueItems}
          formatOverdueDate={formatOverdueDate}
        />

        {/* Money Section */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Money</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PaymentsCard
              succeededPayments={succeededPaymentsLast7}
              unpaidPayments={unpaidPayments}
              getContactName={getContactName}
              formatPaymentAmount={formatPaymentAmount}
              getPaymentStatusBadge={getPaymentStatusBadge}
            />
          </div>
        </div>

        <SendInvoiceModal
          open={isInvoiceModalOpen}
          onOpenChange={setIsInvoiceModalOpen}
          currentCompanyId={currentCompanyId}
        />
      </div>
    </div>
  );
}
