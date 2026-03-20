"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { formatAssignedCrew, formatVisitCrew } from "@/hooks/use-employee-names";
import PageHeader from "@/components/shared/page-header";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  Loader2,
} from "lucide-react";
import { getDisplayName } from "@/lib/contact-display";
import type { Location } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const dow = copy.getDay(); // 0 = Sun
  copy.setDate(copy.getDate() - dow);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatTime12(time24?: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6 AM - 6 PM

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function SchedulePage() {
  const { currentCompanyId } = useCompany();

  // State
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [selectedTeamId, setSelectedTeamId] = useState<string | "all">("all");

  // Data fetching
  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ["maintenance-visits", currentCompanyId],
    queryFn: () => db.MaintenanceVisit.filter({ company_id: currentCompanyId }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: scheduleBlocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["schedule-blocks", currentCompanyId],
    queryFn: () => db.ScheduleBlock.filter({ company_id: currentCompanyId }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", currentCompanyId],
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams", currentCompanyId],
    queryFn: () => db.Team.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ["locations-schedule", currentCompanyId],
    queryFn: () => db.Location.filter({ company_id: currentCompanyId } as Partial<Location>),
    staleTime: 5 * 60 * 1000,
  });

  // Week days array
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Navigation
  const goToday = () => {
    const now = new Date();
    setWeekStart(startOfWeek(now));
    setSelectedDay(now);
  };
  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));

  // Filter helpers
  const getContactName = (contactId: string, locationId?: string) => {
    const c = contacts.find((x) => x.id === contactId);
    const loc = locationId ? allLocations.find((l) => l.id === locationId) : undefined;
    return getDisplayName(c, loc);
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return null;
    const t = teams.find((x) => x.id === teamId);
    return t ? t.name : null;
  };

  // Filter visits by team
  const filterByTeam = <T extends { assigned_team_id?: string; assigned_employee_ids?: string[] }>(
    items: T[]
  ): T[] => {
    if (selectedTeamId === "all") return items;
    return items.filter((item) => item.assigned_team_id === selectedTeamId);
  };

  // Today's visits (for the list)
  const todayStr = isoDate(viewMode === "day" ? selectedDay : new Date());
  const todayVisits = useMemo(() => {
    const dayStr = viewMode === "day" ? isoDate(selectedDay) : isoDate(new Date());
    return filterByTeam(
      visits.filter(
        (v) =>
          v.visit_date === dayStr &&
          v.status !== "cancelled" &&
          v.status !== "skipped"
      )
    ).sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [visits, selectedDay, viewMode, selectedTeamId]);

  // Blocks for a given day
  const getBlocksForDay = (dateStr: string) =>
    filterByTeam(
      scheduleBlocks.filter((b) => b.start_date <= dateStr && b.end_date >= dateStr)
    );

  // Visits for a given day
  const getVisitsForDay = (dateStr: string) =>
    filterByTeam(
      visits.filter(
        (v) =>
          v.visit_date === dateStr &&
          v.status !== "cancelled" &&
          v.status !== "skipped"
      )
    );

  const isLoading = visitsLoading || blocksLoading;

  // Status badge for visits
  const visitStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
      completed: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
      skipped: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400",
    };
    return (
      <Badge variant="outline" className={variants[status] || "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-400"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Block type color
  const blockColor = (type: string, color?: string) => {
    if (color) return color;
    if (type === "project") return "#22c55e";
    if (type === "maintenance") return "#f59e0b";
    return "#6b7280";
  };

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
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Schedule</h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">Crew availability and project scheduling</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === "day"
                    ? "bg-green-600 text-white"
                    : "bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 text-sm font-medium ${
                  viewMode === "week"
                    ? "bg-green-600 text-white"
                    : "bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                Week
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={prevWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[180px] text-center">
              {formatDate(weekDays[0])} &ndash; {formatDate(weekDays[6])}
            </span>
            <Button variant="ghost" size="icon" onClick={nextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Crew Filter Bar */}
        <Card className="shadow-sm">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Crew Filter:</span>
              <button
                onClick={() => setSelectedTeamId("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTeamId === "all"
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                All Crews
              </button>
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    selectedTeamId === team.id
                      ? "text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                  style={
                    selectedTeamId === team.id
                      ? { backgroundColor: team.color || "#22c55e" }
                      : {}
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: team.color || "#22c55e" }}
                  />
                  {team.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            {/* Week View - Time Grid */}
            {viewMode === "week" && (
              <Card className="shadow-lg overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {/* Header row */}
                      <div className="grid grid-cols-8 border-b border-border bg-muted">
                        <div className="p-2 text-xs font-medium text-muted-foreground border-r border-border" />
                        {weekDays.map((day) => {
                          const isToday = isoDate(day) === isoDate(new Date());
                          return (
                            <div
                              key={day.toISOString()}
                              className={`p-2 text-center border-r border-border last:border-r-0 ${
                                isToday ? "bg-green-50 dark:bg-green-950/20" : ""
                              }`}
                            >
                              <div className="text-xs font-medium text-muted-foreground">
                                {day.toLocaleDateString("en-US", { weekday: "short" })}
                              </div>
                              <div
                                className={`text-lg font-bold ${
                                  isToday ? "text-green-600" : "text-foreground"
                                }`}
                              >
                                {day.getDate()}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Time rows */}
                      {HOURS.map((hour) => {
                        const hourStr = String(hour).padStart(2, "0");
                        const h12 = hour > 12 ? hour - 12 : hour;
                        const ampm = hour >= 12 ? "PM" : "AM";
                        return (
                          <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                            <div className="p-2 text-xs text-muted-foreground border-r border-border text-right pr-3">
                              {h12}:00 {ampm}
                            </div>
                            {weekDays.map((day) => {
                              const dateStr = isoDate(day);
                              const isToday = dateStr === isoDate(new Date());
                              const dayBlocks = getBlocksForDay(dateStr).filter((b) => {
                                if (!b.start_time) return hour === 8; // all-day at 8am
                                return parseInt(b.start_time.split(":")[0]) === hour;
                              });
                              const dayVisits = getVisitsForDay(dateStr).filter((v) => {
                                if (!v.start_time) return hour === 9;
                                return parseInt(v.start_time.split(":")[0]) === hour;
                              });
                              return (
                                <div
                                  key={day.toISOString()}
                                  className={`p-1 border-r border-border last:border-r-0 min-h-[52px] ${
                                    isToday ? "bg-green-50/30 dark:bg-green-950/10" : ""
                                  }`}
                                >
                                  {dayBlocks.map((block) => (
                                    <div
                                      key={block.id}
                                      className="rounded px-1.5 py-0.5 mb-0.5 text-xs text-white truncate"
                                      style={{
                                        backgroundColor: blockColor(block.block_type, block.color),
                                      }}
                                      title={block.title}
                                    >
                                      {block.title}
                                    </div>
                                  ))}
                                  {dayVisits.map((visit) => (
                                    <div
                                      key={visit.id}
                                      className="rounded px-1.5 py-0.5 mb-0.5 text-xs bg-amber-100 text-amber-800 truncate border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-400"
                                      title={`${getContactName(visit.contact_id, visit.location_id)} - ${formatTime12(visit.start_time)}`}
                                    >
                                      {getContactName(visit.contact_id, visit.location_id).split(" ")[1] || getContactName(visit.contact_id, visit.location_id)}
                                    </div>
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

            {/* Day View */}
            {viewMode === "day" && (
              <Card className="shadow-lg overflow-hidden">
                <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      {selectedDay.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDay(addDays(selectedDay, -1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedDay(addDays(selectedDay, 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {HOURS.map((hour) => {
                    const hourStr = String(hour).padStart(2, "0");
                    const h12 = hour > 12 ? hour - 12 : hour;
                    const ampm = hour >= 12 ? "PM" : "AM";
                    const dateStr = isoDate(selectedDay);
                    const dayBlocks = getBlocksForDay(dateStr).filter((b) => {
                      if (!b.start_time) return hour === 8;
                      return parseInt(b.start_time.split(":")[0]) === hour;
                    });
                    const dayVisits = getVisitsForDay(dateStr).filter((v) => {
                      if (!v.start_time) return hour === 9;
                      return parseInt(v.start_time.split(":")[0]) === hour;
                    });
                    return (
                      <div key={hour} className="flex border-b last:border-b-0">
                        <div className="w-20 flex-shrink-0 p-3 text-sm text-muted-foreground text-right border-r border-border">
                          {h12}:00 {ampm}
                        </div>
                        <div className="flex-1 p-2 min-h-[60px] space-y-1">
                          {dayBlocks.map((block) => (
                            <div
                              key={block.id}
                              className="rounded-lg px-3 py-2 text-sm text-white flex items-center justify-between"
                              style={{
                                backgroundColor: blockColor(block.block_type, block.color),
                              }}
                            >
                              <div>
                                <div className="font-medium">{block.title}</div>
                                <div className="text-xs opacity-80">
                                  {formatTime12(block.start_time)} - {formatTime12(block.end_time)}
                                  {block.assigned_employee_ids &&
                                    ` | ${formatAssignedCrew(block.assigned_employee_ids, employees)}`}
                                </div>
                              </div>
                              <Badge
                                variant="secondary"
                                className="bg-white/20 text-white border-0 text-xs"
                              >
                                {block.block_type}
                              </Badge>
                            </div>
                          ))}
                          {dayVisits.map((visit) => (
                            <div
                              key={visit.id}
                              className="rounded-lg px-3 py-2 text-sm bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-amber-900">
                                  {getContactName(visit.contact_id, visit.location_id)}
                                </div>
                                <div className="text-xs text-amber-700">
                                  {formatTime12(visit.start_time)} - {formatTime12(visit.end_time)}
                                  {" | "}
                                  {formatVisitCrew(visit, employees, teams) || "Unassigned"}
                                  {visit.duration_minutes && ` | ${visit.duration_minutes} min`}
                                </div>
                              </div>
                              {visitStatusBadge(visit.status)}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Today's Visit List */}
            <Card className="shadow-lg">
              <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  {viewMode === "day"
                    ? `Visits for ${selectedDay.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "Today's Visits"}
                  <Badge variant="secondary" className="ml-2">
                    {todayVisits.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {todayVisits.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No visits scheduled for this day.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {todayVisits.map((visit) => {
                      const contact = contacts.find((c) => c.id === visit.contact_id);
                      return (
                        <div
                          key={visit.id}
                          className="p-4 hover:bg-accent transition-colors flex items-center gap-4"
                        >
                          {/* Time */}
                          <div className="w-24 flex-shrink-0">
                            <div className="text-sm font-semibold text-foreground">
                              {formatTime12(visit.start_time)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {visit.duration_minutes ? `${visit.duration_minutes} min` : ""}
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">
                              {getContactName(visit.contact_id, visit.location_id)}
                            </div>
                            {contact?.address_line1 && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {contact.address_line1}, {contact.city}
                              </div>
                            )}
                            {visit.notes && (
                              <div className="text-xs text-amber-600 mt-0.5">{visit.notes}</div>
                            )}
                          </div>

                          {/* Service */}
                          <div className="hidden md:block text-sm text-muted-foreground max-w-[200px] truncate">
                            {visit.service_performed || "Scheduled service"}
                          </div>

                          {/* Crew */}
                          <div className="hidden sm:block">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: teams.find((t) => t.id === visit.assigned_team_id)?.color || "#d1d5db",
                                color: teams.find((t) => t.id === visit.assigned_team_id)?.color || "#6b7280",
                              }}
                            >
                              {formatVisitCrew(visit, employees, teams) || "Unassigned"}
                            </Badge>
                          </div>

                          {/* Status */}
                          {visitStatusBadge(visit.status)}

                          {/* Amount */}
                          {visit.amountDue && (
                            <div className={`text-sm font-medium w-16 text-right ${visit.status === "completed" ? "text-green-700" : "text-muted-foreground"}`}>
                              ${visit.amountDue}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
