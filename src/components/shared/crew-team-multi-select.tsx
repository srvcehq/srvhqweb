"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import type { Employee, Team } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, Check, Users, UsersRound } from "lucide-react";

export interface CrewTeamSelection {
  teamIds: string[];
  employeeIds: string[];
}

interface CrewTeamMultiSelectProps {
  teamIds?: string[];
  employeeIds?: string[];
  onChange: (selection: CrewTeamSelection) => void;
  placeholder?: string;
}

/**
 * Multi-select that supports both Teams and individual Employees.
 * Returns: { teamIds: string[], employeeIds: string[] }
 */
export default function CrewTeamMultiSelect({
  teamIds = [],
  employeeIds = [],
  onChange,
  placeholder = "Select teams or employees...",
}: CrewTeamMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const all = await db.Employee.list();
      return all.filter((e) => e.status !== "inactive");
    },
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["teams-active"],
    queryFn: async () => {
      const all = await db.Team.list();
      return all;
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTeams = teams.filter((t) => teamIds.includes(t.id));
  const selectedEmployees = employees.filter((e) => employeeIds.includes(e.id));

  const getEmployeeName = (employee: Employee): string => {
    return employee.display_name || `${employee.first_name} ${employee.last_name}`;
  };

  const handleToggleTeam = (teamId: string) => {
    const newTeamIds = teamIds.includes(teamId)
      ? teamIds.filter((id) => id !== teamId)
      : [...teamIds, teamId];
    onChange({ teamIds: newTeamIds, employeeIds });
  };

  const handleToggleEmployee = (empId: string) => {
    const newEmployeeIds = employeeIds.includes(empId)
      ? employeeIds.filter((id) => id !== empId)
      : [...employeeIds, empId];
    onChange({ teamIds, employeeIds: newEmployeeIds });
  };

  const handleRemoveTeam = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ teamIds: teamIds.filter((id) => id !== teamId), employeeIds });
  };

  const handleRemoveEmployee = (empId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ teamIds, employeeIds: employeeIds.filter((id) => id !== empId) });
  };

  const hasSelections = selectedTeams.length > 0 || selectedEmployees.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[40px] px-3 py-2 border border-border rounded-md bg-card cursor-pointer flex items-center flex-wrap gap-1.5 hover:border-gray-400 transition-colors"
      >
        {!hasSelections ? (
          <span className="text-muted-foreground text-sm">{placeholder}</span>
        ) : (
          <>
            {selectedTeams.map((team) => (
              <Badge
                key={`team-${team.id}`}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
                style={{
                  backgroundColor: team.color ? `${team.color}20` : "#3b82f620",
                  borderColor: team.color || "#3b82f6",
                  color: team.color || "#3b82f6",
                }}
              >
                <UsersRound className="w-3 h-3" />
                {team.name}
                <span className="text-xs opacity-70">
                  ({team.member_ids?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveTeam(team.id, e)}
                  className="ml-1 hover:bg-accent rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {selectedEmployees.map((emp) => (
              <Badge
                key={`emp-${emp.id}`}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
                style={{
                  backgroundColor: emp.color ? `${emp.color}20` : undefined,
                  borderColor: emp.color || undefined,
                  color: emp.color || undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: emp.color || "#22c55e" }}
                />
                {getEmployeeName(emp)}
                <button
                  type="button"
                  onClick={(e) => handleRemoveEmployee(emp.id, e)}
                  className="ml-1 hover:bg-accent rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
          {/* Teams Section */}
          {teams.length > 0 && (
            <>
              <div className="px-3 py-2 bg-muted border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <UsersRound className="w-3 h-3" />
                Teams
              </div>
              {teams.map((team) => {
                const isSelected = teamIds.includes(team.id);
                return (
                  <div
                    key={`team-${team.id}`}
                    onClick={() => handleToggleTeam(team.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-accent"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color || "#3b82f6" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {team.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {team.member_ids?.length || 0} member
                        {(team.member_ids?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Employees Section */}
          <div className="px-3 py-2 bg-muted border-b border-t border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" />
            Employees
          </div>
          {employees.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No active employees found.
            </div>
          ) : (
            employees.map((emp) => {
              const isSelected = employeeIds.includes(emp.id);
              return (
                <div
                  key={`emp-${emp.id}`}
                  onClick={() => handleToggleEmployee(emp.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-green-50 dark:bg-green-900/20" : "hover:bg-accent"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-green-500 border-green-500"
                        : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: emp.color || "#22c55e" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getEmployeeName(emp)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emp.role || "Crew Member"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
