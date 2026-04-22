"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { formatAssignedCrew, formatVisitCrew } from "@/hooks/use-employee-names";
import { isoDate, addDays, startOfWeek, startOfMonth, formatTime12, todayStr } from "@/lib/format-helpers";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import type { MaintenanceVisit, Location, Employee, Payment } from "@/data/types";
import { useSendCommunication } from "@/hooks/use-send-communication";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  MapPin,
  Navigation,
  Send,
  Users,
  X,
} from "lucide-react";
import { getDisplayName } from "@/lib/contact-display";

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SchedulePage() {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const today = todayStr();

  // View state
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));

  // Filters
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");

  // Modals
  const [detailVisit, setDetailVisit] = useState<MaintenanceVisit | null>(null);
  const [unassignedDay, setUnassignedDay] = useState<string | null>(null);
  const [assignVisitId, setAssignVisitId] = useState<string | null>(null);
  const [assignTargetEmployee, setAssignTargetEmployee] = useState("");

  // Data
  const { data: visits = [], isLoading: vLoading } = useQuery({
    queryKey: queryKeys.maintenanceVisits(currentCompanyId),
    queryFn: () => db.MaintenanceVisit.filter({ company_id: currentCompanyId }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: blocks = [], isLoading: bLoading } = useQuery({
    queryKey: queryKeys.scheduleBlocks(currentCompanyId),
    queryFn: () => db.ScheduleBlock.filter({ company_id: currentCompanyId }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: queryKeys.employees(),
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: queryKeys.teams(),
    queryFn: () => db.Team.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: queryKeys.contacts(currentCompanyId),
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: locations = [] } = useQuery({
    queryKey: queryKeys.locations(currentCompanyId),
    queryFn: () =>
      db.Location.filter({ company_id: currentCompanyId } as Partial<Location>),
    staleTime: 5 * 60 * 1000,
  });

  const { sendServicePayLink, sendCardCharged, isSending } = useSendCommunication();

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status !== "inactive"),
    [employees]
  );

  const isLoading = vLoading || bLoading;

  // Filter by employee
  const filterItems = <T extends { assigned_employee_ids?: string[]; assigned_team_id?: string }>(
    items: T[]
  ): T[] => {
    if (selectedEmployeeId === "all") return items;
    if (selectedEmployeeId === "unassigned") {
      return items.filter(
        (i) => !i.assigned_employee_ids || i.assigned_employee_ids.length === 0
      );
    }
    return items.filter(
      (i) => i.assigned_employee_ids?.includes(selectedEmployeeId)
    );
  };

  // Helpers
  const getName = (contactId: string, locationId?: string) => {
    const c = contacts.find((x) => x.id === contactId);
    const loc = locationId ? locations.find((l) => l.id === locationId) : undefined;
    return getDisplayName(c, loc);
  };

  const getAddress = (visit: MaintenanceVisit) => {
    if (visit.location_id) {
      const loc = locations.find((l) => l.id === visit.location_id);
      if (loc) return `${loc.address_line1 || ""}, ${loc.city || ""}`;
    }
    const c = contacts.find((x) => x.id === visit.contact_id);
    return c ? `${c.address_line1 || ""}, ${c.city || ""}` : "";
  };

  const getVisitsForDay = (dateStr: string) =>
    filterItems(
      visits.filter(
        (v) => v.visit_date === dateStr && v.status !== "cancelled" && v.status !== "skipped"
      )
    );

  const getBlocksForDay = (dateStr: string) =>
    filterItems(blocks.filter((b) => b.start_date <= dateStr && b.end_date >= dateStr));

  const getUnassignedCountForDay = (dateStr: string) =>
    visits.filter(
      (v) =>
        v.visit_date === dateStr &&
        v.status === "scheduled" &&
        (!v.assigned_employee_ids || v.assigned_employee_ids.length === 0)
    ).length;

  // Week days
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Month calendar grid
  const monthGrid = useMemo(() => {
    const first = monthStart;
    const gridStart = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthStart]);

  // Nav
  const goToday = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now));
    setSelectedDay(now);
    setMonthStart(startOfMonth(now));
  };

  // Mutations
  const markCompleteMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const visit = visits.find((v) => v.id === visitId);
      await db.MaintenanceVisit.update(visitId, { status: "completed" });
      if (visit?.amountDue && visit.amountDue > 0) {
        const payment = await db.Payment.create({
          company_id: currentCompanyId,
          contact_id: visit.contact_id,
          maintenance_visit_id: visit.id,
          maintenance_plan_id: visit.maintenance_plan_id,
          type: "maintenance",
          amount: visit.amountDue,
          status: "unpaid",
          description: `Maintenance visit — ${getName(visit.contact_id, visit.location_id)}`,
          due_date: todayStr(),
        });
        return { visit, payment };
      }
      return { visit, payment: null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceVisits(currentCompanyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(currentCompanyId) });
      toast.success("Visit completed. Payment created.");
      setDetailVisit(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { visitId: string; employeeId: string }) => {
      await db.MaintenanceVisit.update(data.visitId, {
        assigned_employee_ids: [data.employeeId],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceVisits(currentCompanyId) });
      toast.success("Job assigned.");
      setAssignVisitId(null);
      setAssignTargetEmployee("");
    },
  });

  // Google Maps
  const canOpenMaps = selectedEmployeeId !== "all" && selectedEmployeeId !== "unassigned";

  const handleOpenMaps = () => {
    if (!canOpenMaps) return;
    const dateStr = viewMode === "day" ? isoDate(selectedDay) : today;
    const dayVisits = visits
      .filter(
        (v) =>
          v.visit_date === dateStr &&
          v.status !== "cancelled" &&
          v.assigned_employee_ids?.includes(selectedEmployeeId)
      )
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

    const addrs = dayVisits
      .map((v) => getAddress(v))
      .filter((a) => a.length > 3);

    if (addrs.length === 0) {
      toast.error("No addresses found for this employee today.");
      return;
    }
    window.open(
      `https://www.google.com/maps/dir/${addrs.map(encodeURIComponent).join("/")}`,
      "_blank"
    );
  };

  // Status badge
  const statusBadge = (status: string) => {
    const cls: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    };
    return (
      <Badge variant="outline" className={cls[status] || "bg-gray-100 text-gray-700"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
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
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Schedule
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Daily operations and crew scheduling
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              {(["day", "week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize ${
                    viewMode === mode
                      ? "bg-green-600 text-white"
                      : "bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (viewMode === "month") setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1));
                else if (viewMode === "week") setWeekStart(addDays(weekStart, -7));
                else setSelectedDay(addDays(selectedDay, -1));
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[160px] text-center">
              {viewMode === "week" &&
                `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2013 ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              {viewMode === "day" &&
                selectedDay.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              {viewMode === "month" &&
                monthStart.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (viewMode === "month") setMonthStart(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));
                else if (viewMode === "week") setWeekStart(addDays(weekStart, 7));
                else setSelectedDay(addDays(selectedDay, 1));
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {/* Google Maps */}
            <Button
              variant="outline"
              size="sm"
              disabled={!canOpenMaps}
              onClick={handleOpenMaps}
              title={
                canOpenMaps
                  ? "Open route in Google Maps"
                  : "Select exactly one employee"
              }
            >
              <Navigation className="w-4 h-4 mr-1" />
              Maps
            </Button>
          </div>
        </div>

        {/* Employee Filter */}
        <Card className="shadow-sm">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
              {[
                { id: "all", label: "All Crew" },
                { id: "unassigned", label: "Unassigned" },
                ...activeEmployees.map((e) => ({
                  id: e.id,
                  label: e.display_name || `${e.first_name} ${e.last_name}`,
                  color: e.color,
                })),
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedEmployeeId(opt.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedEmployeeId === opt.id
                      ? "text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                  style={
                    selectedEmployeeId === opt.id
                      ? { backgroundColor: ("color" in opt && opt.color) || "#22c55e" }
                      : {}
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ============ WEEK VIEW ============ */}
        {viewMode === "week" && (
          <Card className="shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  {/* Header */}
                  <div className="grid grid-cols-8 border-b bg-muted">
                    <div className="p-2 text-xs font-medium text-muted-foreground border-r" />
                    {weekDays.map((day) => {
                      const ds = isoDate(day);
                      const isToday = ds === today;
                      const unassigned = getUnassignedCountForDay(ds);
                      return (
                        <div
                          key={ds}
                          className={`p-2 text-center border-r last:border-r-0 ${isToday ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                        >
                          <div className="text-xs font-medium text-muted-foreground">
                            {day.toLocaleDateString("en-US", { weekday: "short" })}
                          </div>
                          <div className={`text-lg font-bold ${isToday ? "text-green-600" : "text-foreground"}`}>
                            {day.getDate()}
                          </div>
                          {unassigned > 0 && (
                            <button
                              className="text-[10px] text-amber-600 hover:underline"
                              onClick={() => setUnassignedDay(ds)}
                            >
                              {unassigned} unassigned
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Time rows */}
                  {HOURS.map((hour) => {
                    const h12 = hour > 12 ? hour - 12 : hour;
                    const ap = hour >= 12 ? "PM" : "AM";
                    return (
                      <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                        <div className="p-2 text-xs text-muted-foreground border-r text-right pr-3">
                          {h12}:00 {ap}
                        </div>
                        {weekDays.map((day) => {
                          const ds = isoDate(day);
                          const isToday = ds === today;
                          const dv = getVisitsForDay(ds).filter((v) => {
                            if (!v.start_time) return hour === 9;
                            return parseInt(v.start_time.split(":")[0]) === hour;
                          });
                          const db2 = getBlocksForDay(ds).filter((b) => {
                            if (!b.start_time) return hour === 8;
                            return parseInt(b.start_time.split(":")[0]) === hour;
                          });
                          return (
                            <div
                              key={ds}
                              className={`p-1 border-r last:border-r-0 min-h-[52px] ${isToday ? "bg-green-50/30 dark:bg-green-950/10" : ""}`}
                            >
                              {db2.map((block) => (
                                <div
                                  key={block.id}
                                  className="rounded px-1.5 py-0.5 mb-0.5 text-xs text-white truncate"
                                  style={{ backgroundColor: block.color || "#22c55e" }}
                                  title={block.title}
                                >
                                  {block.title}
                                </div>
                              ))}
                              {dv.map((visit) => (
                                <button
                                  key={visit.id}
                                  className="w-full rounded px-1.5 py-0.5 mb-0.5 text-xs bg-amber-100 text-amber-800 truncate border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-400 text-left hover:bg-amber-200 transition-colors"
                                  onClick={() => setDetailVisit(visit)}
                                  title={`${getName(visit.contact_id, visit.location_id)} \u2022 ${formatTime12(visit.start_time)} \u2013 ${formatTime12(visit.end_time)}`}
                                >
                                  {getName(visit.contact_id, visit.location_id).split(" ").pop()}
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============ DAY VIEW ============ */}
        {viewMode === "day" && (() => {
          const ds = isoDate(selectedDay);
          const unassigned = getUnassignedCountForDay(ds);
          return (
            <Card className="shadow-lg overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    {selectedDay.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardTitle>
                  {unassigned > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600"
                      onClick={() => setUnassignedDay(ds)}
                    >
                      {unassigned} Unassigned
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {HOURS.map((hour) => {
                  const h12 = hour > 12 ? hour - 12 : hour;
                  const ap = hour >= 12 ? "PM" : "AM";
                  const dv = getVisitsForDay(ds).filter((v) => {
                    if (!v.start_time) return hour === 9;
                    return parseInt(v.start_time.split(":")[0]) === hour;
                  });
                  const db2 = getBlocksForDay(ds).filter((b) => {
                    if (!b.start_time) return hour === 8;
                    return parseInt(b.start_time.split(":")[0]) === hour;
                  });
                  return (
                    <div key={hour} className="flex border-b last:border-b-0">
                      <div className="w-20 shrink-0 p-3 text-sm text-muted-foreground text-right border-r">
                        {h12}:00 {ap}
                      </div>
                      <div className="flex-1 p-2 min-h-[60px] space-y-1">
                        {db2.map((block) => (
                          <div
                            key={block.id}
                            className="rounded-lg px-3 py-2 text-sm text-white flex items-center justify-between"
                            style={{ backgroundColor: block.color || "#22c55e" }}
                          >
                            <div>
                              <div className="font-medium">{block.title}</div>
                              <div className="text-xs opacity-80">
                                {formatTime12(block.start_time)} - {formatTime12(block.end_time)}
                                {block.assigned_employee_ids && ` | ${formatAssignedCrew(block.assigned_employee_ids, employees)}`}
                              </div>
                            </div>
                          </div>
                        ))}
                        {dv.map((visit) => (
                          <button
                            key={visit.id}
                            className="w-full rounded-lg px-3 py-2 text-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 flex items-center justify-between hover:bg-amber-100 transition-colors text-left"
                            onClick={() => setDetailVisit(visit)}
                          >
                            <div>
                              <div className="font-medium text-amber-900 dark:text-amber-400">
                                {getName(visit.contact_id, visit.location_id)}
                              </div>
                              <div className="text-xs text-amber-700 dark:text-amber-500">
                                {formatTime12(visit.start_time)} - {formatTime12(visit.end_time)}
                                {" | "}
                                {formatVisitCrew(visit, employees, teams) || "Unassigned"}
                                {visit.duration_minutes && ` | ${visit.duration_minutes} min`}
                              </div>
                            </div>
                            {statusBadge(visit.status)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {/* ============ MONTH VIEW ============ */}
        {viewMode === "month" && (
          <Card className="shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 border-b bg-muted">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {monthGrid.map((day, i) => {
                  const ds = isoDate(day);
                  const isCurrentMonth = day.getMonth() === monthStart.getMonth();
                  const isToday = ds === today;
                  const dv = getVisitsForDay(ds);
                  const unassigned = getUnassignedCountForDay(ds);

                  return (
                    <div
                      key={i}
                      className={`border-r border-b last:border-r-0 min-h-[90px] p-1.5 ${
                        isCurrentMonth ? "" : "opacity-30"
                      } ${isToday ? "bg-green-50/50 dark:bg-green-950/10" : ""}`}
                    >
                      <div className={`text-xs font-medium mb-1 ${isToday ? "text-green-600" : "text-muted-foreground"}`}>
                        {day.getDate()}
                      </div>
                      {dv.slice(0, 3).map((visit) => (
                        <button
                          key={visit.id}
                          className="w-full text-left rounded px-1 py-0.5 mb-0.5 text-[10px] bg-amber-100 text-amber-800 truncate dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-200 transition-colors"
                          onClick={() => setDetailVisit(visit)}
                        >
                          {getName(visit.contact_id, visit.location_id).split(" ").pop()}
                        </button>
                      ))}
                      {dv.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{dv.length - 3} more</p>
                      )}
                      {unassigned > 0 && (
                        <button
                          className="text-[10px] text-amber-600 hover:underline"
                          onClick={() => setUnassignedDay(ds)}
                        >
                          {unassigned} unassigned
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ============ EVENT DETAIL MODAL ============ */}
      <Dialog
        open={!!detailVisit}
        onOpenChange={(open) => !open && setDetailVisit(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Visit Details
            </DialogTitle>
          </DialogHeader>
          {detailVisit && (() => {
            const contact = contacts.find((c) => c.id === detailVisit.contact_id);
            const isCompleted = detailVisit.status === "completed";
            const addr = getAddress(detailVisit);

            return (
              <div className="space-y-5 mt-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {getName(detailVisit.contact_id, detailVisit.location_id)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        Maintenance Visit
                      </Badge>
                      {statusBadge(detailVisit.status)}
                    </div>
                  </div>
                  {contact && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailVisit(null);
                        window.location.href = `/contacts/${contact.id}`;
                      }}
                    >
                      View Contact
                    </Button>
                  )}
                </div>

                {/* Visit info */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Date</p>
                    <p className="font-medium">
                      {new Date(
                        ...detailVisit.visit_date.split("-").map(Number) as [number, number, number]
                      ).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Service</p>
                    <p className="font-medium">{detailVisit.service_performed || "General maintenance"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Time</p>
                    <p className="font-medium">
                      {formatTime12(detailVisit.start_time)} \u2013 {formatTime12(detailVisit.end_time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Duration</p>
                    <p className="font-medium">{detailVisit.duration_minutes || "\u2014"} min</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Crew</p>
                    <p className="font-medium">
                      {formatVisitCrew(detailVisit, employees, teams) || "Unassigned"}
                    </p>
                  </div>
                  {detailVisit.amountDue && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">Amount Due</p>
                      <p className="font-medium text-green-600">${detailVisit.amountDue}</p>
                    </div>
                  )}
                </div>

                {/* Location */}
                {addr && addr.length > 3 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Location</p>
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span>{addr}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-xs h-7"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`,
                            "_blank"
                          )
                        }
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        Maps
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {detailVisit.notes && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted rounded-lg p-3">{detailVisit.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {!isCompleted && (
                    <Button
                      className="bg-gradient-to-r from-green-500 to-emerald-600"
                      onClick={() => markCompleteMutation.mutate(detailVisit.id)}
                      disabled={markCompleteMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      {markCompleteMutation.isPending ? "Completing..." : "Mark Complete"}
                    </Button>
                  )}

                  {isCompleted && detailVisit.amountDue && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSending}
                        onClick={async () => {
                          if (!contact) return;
                          // Find the payment created for this visit
                          const payments = await db.Payment.filter({
                            company_id: currentCompanyId,
                            maintenance_visit_id: detailVisit.id,
                          });
                          const unpaid = payments.find((p) => p.status === "unpaid");
                          if (unpaid) {
                            await sendServicePayLink(contact, unpaid.amount, unpaid.id);
                          } else {
                            toast.error("No unpaid payment found for this visit.");
                          }
                        }}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        {isSending ? "Sending..." : "Send Pay Link"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `https://pay.terraflow.com/v/${detailVisit.id}`
                          );
                          toast.success("Payment link copied.");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSending}
                        onClick={async () => {
                          if (!contact) return;
                          // Mark the payment as succeeded (simulates card charge)
                          const payments = await db.Payment.filter({
                            company_id: currentCompanyId,
                            maintenance_visit_id: detailVisit.id,
                          });
                          const unpaid = payments.find((p) => p.status === "unpaid");
                          if (unpaid) {
                            await db.Payment.update(unpaid.id, {
                              status: "succeeded",
                              payment_method: "card",
                              paid_date: todayStr(),
                            });
                            await sendCardCharged(contact, unpaid.amount);
                            queryClient.invalidateQueries({ queryKey: queryKeys.payments(currentCompanyId) });
                            toast.success("Card charged. Confirmation sent.");
                          } else {
                            toast.error("No unpaid payment found for this visit.");
                          }
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Charge Card
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto text-muted-foreground"
                    onClick={() => setDetailVisit(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ============ UNASSIGNED JOBS MODAL ============ */}
      <Dialog
        open={!!unassignedDay}
        onOpenChange={(open) => !open && setUnassignedDay(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Unassigned Jobs
            </DialogTitle>
          </DialogHeader>
          {unassignedDay && (() => {
            const unassigned = visits.filter(
              (v) =>
                v.visit_date === unassignedDay &&
                v.status === "scheduled" &&
                (!v.assigned_employee_ids || v.assigned_employee_ids.length === 0)
            );
            return (
              <div className="space-y-2 mt-2">
                {unassigned.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All jobs are assigned.
                  </p>
                ) : (
                  unassigned.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getName(visit.contact_id, visit.location_id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {visit.service_performed || "Maintenance"}{" "}
                          {visit.duration_minutes && `\u2022 ${visit.duration_minutes}m`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 shrink-0"
                        onClick={() => {
                          setAssignVisitId(visit.id);
                          setAssignTargetEmployee("");
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  ))
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ============ ASSIGN JOB MODAL ============ */}
      <Dialog
        open={!!assignVisitId}
        onOpenChange={(open) => !open && setAssignVisitId(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Assign Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Select an employee:</p>
              <Select
                value={assignTargetEmployee}
                onValueChange={setAssignTargetEmployee}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose employee..." />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.display_name || `${e.first_name} ${e.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignVisitId(null)}>
                Cancel
              </Button>
              <Button
                disabled={!assignTargetEmployee || assignMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={() => {
                  if (assignVisitId && assignTargetEmployee) {
                    assignMutation.mutate({
                      visitId: assignVisitId,
                      employeeId: assignTargetEmployee,
                    });
                  }
                }}
              >
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
