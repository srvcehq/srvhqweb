"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";
import type {
  MaintenanceVisit,
  Contact,
  Location,
  Employee,
} from "@/data/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Route,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { isoDate, shiftDate, formatDateLabel } from "@/lib/format-helpers";
import { queryKeys } from "@/lib/query-keys";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getVisitAddress(
  visit: MaintenanceVisit,
  contacts: Contact[],
  locations: Location[]
): { line: string; city: string; zip: string } {
  if (visit.location_id) {
    const loc = locations.find((l) => l.id === visit.location_id);
    if (loc) {
      return {
        line: loc.address_line1 || "",
        city: loc.city || "",
        zip: loc.zip || "",
      };
    }
  }
  const contact = contacts.find((c) => c.id === visit.contact_id);
  return {
    line: contact?.address_line1 || "",
    city: contact?.city || "",
    zip: contact?.zip || "",
  };
}

function getVisitDisplayName(
  visit: MaintenanceVisit,
  contacts: Contact[],
  locations: Location[]
): { name: string; isCommercial: boolean } {
  const contact = contacts.find((c) => c.id === visit.contact_id);
  if (!contact) return { name: "Unknown", isCommercial: false };

  const isCommercial = contact.contact_type === "commercial";
  let name = `${contact.first_name} ${contact.last_name}`;

  if (isCommercial && visit.location_id) {
    const loc = locations.find((l) => l.id === visit.location_id);
    if (loc) name = `${contact.company_name || name} \u2014 ${loc.name}`;
  } else if (isCommercial && contact.company_name) {
    name = contact.company_name;
  }

  return { name, isCommercial };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RouteAssignmentsPage() {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [workingDate, setWorkingDate] = useState(isoDate(new Date()));
  const [groupBy, setGroupBy] = useState<"city" | "zip">("city");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignToEmployee, setAssignToEmployee] = useState("");
  const [expandedRoutes, setExpandedRoutes] = useState<
    Record<string, boolean>
  >({});
  const [expandedGroups, setExpandedGroups] = useState<
    Record<string, boolean>
  >({});

  // Data
  const { data: visits = [], isLoading } = useQuery({
    queryKey: queryKeys.maintenanceVisits(currentCompanyId),
    queryFn: () =>
      db.MaintenanceVisit.filter({ company_id: currentCompanyId }),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: queryKeys.contacts(currentCompanyId),
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  const { data: locations = [] } = useQuery({
    queryKey: queryKeys.locations(currentCompanyId),
    queryFn: () =>
      db.Location.filter({
        company_id: currentCompanyId,
      } as Partial<Location>),
  });

  const { data: employees = [] } = useQuery({
    queryKey: queryKeys.employees(),
    queryFn: () => db.Employee.list(),
    staleTime: 5 * 60 * 1000,
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status !== "inactive"),
    [employees]
  );

  // Filter: selected date + scheduled only
  const dayVisits = useMemo(
    () =>
      visits.filter(
        (v) => v.visit_date === workingDate && v.status === "scheduled"
      ),
    [visits, workingDate]
  );

  const unassignedVisits = useMemo(
    () =>
      dayVisits.filter(
        (v) => !v.assigned_employee_ids || v.assigned_employee_ids.length === 0
      ),
    [dayVisits]
  );

  const assignedVisits = useMemo(
    () =>
      dayVisits.filter(
        (v) => v.assigned_employee_ids && v.assigned_employee_ids.length > 0
      ),
    [dayVisits]
  );

  // Group unassigned by city or zip
  const unassignedGroups = useMemo(() => {
    const groups: Record<string, MaintenanceVisit[]> = {};
    for (const visit of unassignedVisits) {
      const addr = getVisitAddress(visit, contacts, locations);
      const key =
        groupBy === "city" ? addr.city || "Unknown" : addr.zip || "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(visit);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [unassignedVisits, groupBy, contacts, locations]);

  // Group assigned by employee
  const assignedRoutes = useMemo(() => {
    const routes: Record<
      string,
      { employee: Employee | undefined; visits: MaintenanceVisit[] }
    > = {};
    for (const visit of assignedVisits) {
      const empId = visit.assigned_employee_ids![0];
      if (!routes[empId]) {
        routes[empId] = {
          employee: employees.find((e) => e.id === empId),
          visits: [],
        };
      }
      routes[empId].visits.push(visit);
    }
    for (const route of Object.values(routes)) {
      route.visits.sort((a, b) =>
        (a.start_time || "").localeCompare(b.start_time || "")
      );
    }
    return Object.entries(routes);
  }, [assignedVisits, employees]);

  // Mutations
  const assignMutation = useMutation({
    mutationFn: async (data: { visitIds: string[]; employeeId: string }) => {
      for (const id of data.visitIds) {
        await db.MaintenanceVisit.update(id, {
          assigned_employee_ids: [data.employeeId],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceVisits(currentCompanyId) });
      setSelectedIds(new Set());
      toast.success("Jobs assigned.");
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (visitIds: string[]) => {
      for (const id of visitIds) {
        await db.MaintenanceVisit.update(id, {
          assigned_employee_ids: [],
          assigned_team_id: undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceVisits(currentCompanyId) });
      toast.success("Jobs unassigned.");
    },
  });

  // Selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectGroup = useCallback((groupVisits: MaintenanceVisit[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = groupVisits.every((v) => next.has(v.id));
      if (allSelected) {
        groupVisits.forEach((v) => next.delete(v.id));
      } else {
        groupVisits.forEach((v) => next.add(v.id));
      }
      return next;
    });
  }, []);

  const handleAssign = () => {
    if (!assignToEmployee || selectedIds.size === 0) return;
    assignMutation.mutate({
      visitIds: Array.from(selectedIds),
      employeeId: assignToEmployee,
    });
  };

  const handleOpenInMaps = (routeVisits: MaintenanceVisit[]) => {
    const addresses = routeVisits
      .map((v) => {
        const addr = getVisitAddress(v, contacts, locations);
        return `${addr.line}, ${addr.city}`.trim();
      })
      .filter((a) => a.length > 2);
    if (addresses.length === 0) {
      toast.error("No addresses found.");
      return;
    }
    window.open(
      `https://www.google.com/maps/dir/${addresses.map(encodeURIComponent).join("/")}`,
      "_blank"
    );
  };

  const totalMinutes = dayVisits.reduce(
    (s, v) => s + (v.duration_minutes || 0),
    0
  );

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
        {/* Header + Date Nav */}
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
              Assign and optimize daily routes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWorkingDate(shiftDate(workingDate, -1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWorkingDate(isoDate(new Date()))}
            >
              Today
            </Button>
            <span className="text-sm font-medium px-2 min-w-[100px] text-center">
              {formatDateLabel(workingDate)}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => setWorkingDate(shiftDate(workingDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Unassigned</p>
              <p className="text-2xl font-bold text-yellow-600">
                {unassignedVisits.length}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Assigned</p>
              <p className="text-2xl font-bold text-green-600">
                {assignedVisits.length}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Stops</p>
              <p className="text-2xl font-bold">{dayVisits.length}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Est. Work Time</p>
              <p className="text-2xl font-bold">
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Split Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ============ UNASSIGNED JOBS ============ */}
          <Card className="shadow-lg">
            <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  Unassigned Jobs
                  <Badge variant="secondary">{unassignedVisits.length}</Badge>
                </CardTitle>
                <Select
                  value={groupBy}
                  onValueChange={(v) => setGroupBy(v as "city" | "zip")}
                >
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="city">Group by City</SelectItem>
                    <SelectItem value="zip">Group by ZIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {unassignedVisits.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No unassigned jobs for this date
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {unassignedGroups.map(([groupKey, groupVisits]) => {
                      const isExpanded =
                        expandedGroups[groupKey] !== false;
                      const allSelected = groupVisits.every((v) =>
                        selectedIds.has(v.id)
                      );

                      return (
                        <div key={groupKey}>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted text-left text-sm font-medium"
                            onClick={() =>
                              setExpandedGroups((prev) => ({
                                ...prev,
                                [groupKey]: !isExpanded,
                              }))
                            }
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${
                                !isExpanded ? "-rotate-90" : ""
                              }`}
                            />
                            <span>
                              {groupKey} ({groupVisits.length})
                            </span>
                            <button
                              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectGroup(groupVisits);
                              }}
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-border">
                              {groupVisits.map((visit) => {
                                const display = getVisitDisplayName(
                                  visit,
                                  contacts,
                                  locations
                                );
                                const addr = getVisitAddress(
                                  visit,
                                  contacts,
                                  locations
                                );

                                return (
                                  <label
                                    key={visit.id}
                                    className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={selectedIds.has(visit.id)}
                                      onCheckedChange={() =>
                                        toggleSelect(visit.id)
                                      }
                                      className="mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium truncate">
                                          {display.name}
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] h-4"
                                        >
                                          {display.isCommercial
                                            ? "Commercial"
                                            : "Residential"}
                                        </Badge>
                                      </div>
                                      {visit.service_performed && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {visit.service_performed}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" />
                                        {addr.line}
                                        {addr.city && `, ${addr.city}`}
                                      </p>
                                    </div>
                                    {visit.duration_minutes && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {visit.duration_minutes}m
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Sticky assign bar */}
                  {selectedIds.size > 0 && (
                    <div className="sticky bottom-0 border-t border-border bg-background p-3 flex items-center gap-2">
                      <span className="text-sm font-medium whitespace-nowrap">
                        {selectedIds.size} selected
                      </span>
                      <Select
                        value={assignToEmployee}
                        onValueChange={setAssignToEmployee}
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.display_name ||
                                `${emp.first_name} ${emp.last_name}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={
                          !assignToEmployee || assignMutation.isPending
                        }
                        className="bg-gradient-to-r from-green-500 to-emerald-600"
                        onClick={handleAssign}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* ============ ASSIGNED ROUTES ============ */}
          <Card className="shadow-lg">
            <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
              <CardTitle className="text-base flex items-center gap-2">
                Assigned Routes
                <Badge variant="secondary">{assignedRoutes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {assignedRoutes.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No routes for this date. Assign jobs from the left.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {assignedRoutes.map(([empId, route]) => {
                    const empName = route.employee
                      ? route.employee.display_name ||
                        `${route.employee.first_name} ${route.employee.last_name}`
                      : "Unknown";
                    const totalMin = route.visits.reduce(
                      (s, v) => s + (v.duration_minutes || 0),
                      0
                    );
                    const isExpanded = expandedRoutes[empId] !== false;

                    return (
                      <div key={empId}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted text-left"
                          onClick={() =>
                            setExpandedRoutes((prev) => ({
                              ...prev,
                              [empId]: !isExpanded,
                            }))
                          }
                        >
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{
                              backgroundColor:
                                route.employee?.color || "#22c55e",
                            }}
                          >
                            {empName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {empName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {route.visits.length} stop
                              {route.visits.length !== 1 ? "s" : ""} &bull;{" "}
                              {Math.floor(totalMin / 60)}h {totalMin % 60}m
                            </p>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              !isExpanded ? "-rotate-90" : ""
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div>
                            {route.visits.map((visit, idx) => {
                              const display = getVisitDisplayName(
                                visit,
                                contacts,
                                locations
                              );
                              const addr = getVisitAddress(
                                visit,
                                contacts,
                                locations
                              );

                              return (
                                <div
                                  key={visit.id}
                                  className="flex items-start gap-3 px-4 py-3 border-t border-border hover:bg-accent/30"
                                >
                                  <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {display.name}
                                    </p>
                                    {visit.service_performed && (
                                      <p className="text-xs text-muted-foreground">
                                        {visit.service_performed}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3" />
                                      {addr.line}
                                      {addr.city && `, ${addr.city}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {visit.duration_minutes && (
                                      <span className="text-xs text-muted-foreground mr-2">
                                        {visit.duration_minutes}m
                                      </span>
                                    )}
                                    <Select
                                      value=""
                                      onValueChange={(newEmpId) =>
                                        assignMutation.mutate({
                                          visitIds: [visit.id],
                                          employeeId: newEmpId,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-7 w-7 p-0 border-0 [&>svg]:hidden">
                                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {activeEmployees
                                          .filter((e) => e.id !== empId)
                                          .map((e) => (
                                            <SelectItem
                                              key={e.id}
                                              value={e.id}
                                            >
                                              Move to{" "}
                                              {e.display_name ||
                                                `${e.first_name} ${e.last_name}`}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                      onClick={() =>
                                        unassignMutation.mutate([visit.id])
                                      }
                                      title="Unassign"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}

                            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/30">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() =>
                                  unassignMutation.mutate(
                                    route.visits.map((v) => v.id)
                                  )
                                }
                              >
                                Unassign All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() =>
                                  handleOpenInMaps(route.visits)
                                }
                              >
                                <Navigation className="w-3 h-3 mr-1" />
                                Open in Maps
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
