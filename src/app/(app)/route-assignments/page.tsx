"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { formatAssignedCrew, formatVisitCrew } from "@/hooks/use-employee-names";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Map,
  MapPin,
  Route,
  Users,
} from "lucide-react";
import { getDisplayName, getDisplayAddress } from "@/lib/contact-display";
import type { Location } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function RouteAssignmentsPage() {
  const { currentCompanyId } = useCompany();
  const [workingDate, setWorkingDate] = useState<Date>(new Date());
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // Data fetching
  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ["maintenance-visits-route", currentCompanyId],
    queryFn: () => db.MaintenanceVisit.filter({ company_id: currentCompanyId }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: scheduleBlocks = [] } = useQuery({
    queryKey: ["schedule-blocks-route", currentCompanyId],
    queryFn: () => db.ScheduleBlock.filter({ company_id: currentCompanyId }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-route", currentCompanyId],
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams-route", currentCompanyId],
    queryFn: () => db.Team.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-route", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ["locations-route", currentCompanyId],
    queryFn: () => db.Location.filter({ company_id: currentCompanyId } as Partial<Location>),
    staleTime: 5 * 60 * 1000,
  });

  // Selected day string
  const dateStr = isoDate(workingDate);

  // Visits for the selected day, grouped by team
  const dayVisits = useMemo(() => {
    return visits
      .filter(
        (v) =>
          v.visit_date === dateStr &&
          v.status !== "cancelled" &&
          v.status !== "skipped"
      )
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }, [visits, dateStr]);

  // Schedule blocks for the selected day
  const dayBlocks = useMemo(() => {
    return scheduleBlocks.filter(
      (b) => b.start_date <= dateStr && b.end_date >= dateStr
    );
  }, [scheduleBlocks, dateStr]);

  // Group by team
  const teamAssignments = useMemo(() => {
    const grouped: Record<
      string,
      {
        team: (typeof teams)[0] | null;
        visits: typeof dayVisits;
        blocks: typeof dayBlocks;
      }
    > = {};

    // Initialize teams
    for (const team of teams) {
      grouped[team.id] = { team, visits: [], blocks: [] };
    }
    grouped["unassigned"] = { team: null, visits: [], blocks: [] };

    // Group visits
    for (const visit of dayVisits) {
      const teamId = visit.assigned_team_id || "unassigned";
      if (!grouped[teamId]) {
        grouped[teamId] = { team: null, visits: [], blocks: [] };
      }
      grouped[teamId].visits.push(visit);
    }

    // Group blocks
    for (const block of dayBlocks) {
      const teamId = block.assigned_team_id || "unassigned";
      if (!grouped[teamId]) {
        grouped[teamId] = { team: null, visits: [], blocks: [] };
      }
      grouped[teamId].blocks.push(block);
    }

    return grouped;
  }, [teams, dayVisits, dayBlocks]);

  // Helpers
  const getContactNameForVisit = (contactId: string, locationId?: string) => {
    const c = contacts.find((x) => x.id === contactId);
    const loc = locationId ? allLocations.find((l) => l.id === locationId) : undefined;
    return getDisplayName(c, loc);
  };

  const getContactAddressForVisit = (contactId: string, locationId?: string) => {
    const c = contacts.find((x) => x.id === contactId);
    const loc = locationId ? allLocations.find((l) => l.id === locationId) : undefined;
    return getDisplayAddress(c, loc);
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const isExpanded = (teamId: string) => expandedTeams[teamId] !== false;

  const totalStops = dayVisits.length + dayBlocks.length;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Route className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Route Assignments
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Manage daily crew routes and stop assignments
            </p>
          </div>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                {workingDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={workingDate}
                onSelect={(d) => d && setWorkingDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Teams</p>
                <p className="text-2xl font-bold text-foreground">{teams.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stops</p>
                <p className="text-2xl font-bold text-foreground">{totalStops}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Minutes</p>
                <p className="text-2xl font-bold text-foreground">
                  {dayVisits.reduce((sum, v) => sum + (v.duration_minutes || 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team Routes */}
          <div className="lg:col-span-2 space-y-4">
            {visitsLoading ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : (
              Object.entries(teamAssignments)
                .filter(
                  ([, data]) => data.visits.length > 0 || data.blocks.length > 0
                )
                .map(([teamId, data]) => {
                  const teamColor = data.team?.color || "#6b7280";
                  const teamName = data.team?.name || "Unassigned";
                  const members = data.team?.member_ids
                    ? data.team.member_ids
                        .map((id) => employees.find((e) => e.id === id))
                        .filter(Boolean)
                    : [];

                  return (
                    <Card key={teamId} className="shadow-lg overflow-hidden">
                      <div
                        className="cursor-pointer"
                        onClick={() => toggleTeam(teamId)}
                      >
                        <CardHeader
                          className="py-3 border-b"
                          style={{ borderLeftWidth: 4, borderLeftColor: teamColor }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded(teamId) ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                              <div>
                                <CardTitle className="text-base">{teamName}</CardTitle>
                                {members.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {members.map((e) => e!.first_name).join(", ")}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: teamColor, color: teamColor }}
                              >
                                {data.visits.length} visits
                              </Badge>
                              {data.blocks.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {data.blocks.length} blocks
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </div>

                      {isExpanded(teamId) && (
                        <CardContent className="p-0">
                          {/* Schedule blocks */}
                          {data.blocks.map((block) => (
                            <div
                              key={block.id}
                              className="px-4 py-3 border-b flex items-center gap-3 bg-muted"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: block.color || teamColor }}
                              >
                                P
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground">
                                  {block.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatTime12(block.start_time)} -{" "}
                                  {formatTime12(block.end_time)}
                                  {block.notes && ` | ${block.notes}`}
                                </div>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-xs capitalize"
                              >
                                {block.block_type}
                              </Badge>
                            </div>
                          ))}

                          {/* Visits as numbered stops */}
                          {data.visits.map((visit, idx) => {
                            const address = getContactAddressForVisit(visit.contact_id, visit.location_id);
                            return (
                              <div
                                key={visit.id}
                                className="px-4 py-3 border-b last:border-b-0 flex items-center gap-3 hover:bg-accent transition-colors"
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ backgroundColor: teamColor }}
                                >
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-foreground">
                                    {getContactNameForVisit(visit.contact_id, visit.location_id)}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {formatTime12(visit.start_time)} -{" "}
                                    {formatTime12(visit.end_time)}
                                    {visit.duration_minutes &&
                                      ` (${visit.duration_minutes} min)`}
                                  </div>
                                  {address && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" />
                                      {address}
                                    </div>
                                  )}
                                  {visit.notes && (
                                    <div className="text-xs text-amber-600 mt-0.5">
                                      {visit.notes}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {visit.amountDue && (
                                    <div className={`text-sm font-medium ${visit.status === "completed" ? "text-green-700" : "text-muted-foreground"}`}>
                                      ${visit.amountDue}
                                    </div>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      visit.status === "completed"
                                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40"
                                        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40"
                                    }`}
                                  >
                                    {visit.status}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      )}
                    </Card>
                  );
                })
            )}

            {!visitsLoading && totalStops === 0 && (
              <Card className="shadow-lg">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Map className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No assignments for this day</p>
                  <p className="text-sm mt-1">Select a different date to view route assignments.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map Placeholder */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg sticky top-4">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Map className="w-4 h-4 text-green-600" />
                  Map View
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] bg-muted flex items-center justify-center">
                  <div className="text-center p-6">
                    <Map className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Map view requires Google Maps API key
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure in Settings to enable interactive route maps
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
