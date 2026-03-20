"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import type { Employee } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, Check, Users } from "lucide-react";

interface EmployeeMultiSelectProps {
  value?: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

/**
 * Multi-select dropdown for choosing employees.
 * Returns an array of selected employee IDs.
 */
export default function EmployeeMultiSelect({
  value = [],
  onChange,
  placeholder = "Select employees...",
}: EmployeeMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const all = await db.Employee.list();
      return all.filter((e) => e.status !== "inactive");
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEmployees = employees.filter((e) => value.includes(e.id));

  const getDisplayName = (employee: Employee): string => {
    return employee.display_name || `${employee.first_name} ${employee.last_name}`;
  };

  const handleToggle = (employeeId: string) => {
    if (value.includes(employeeId)) {
      onChange(value.filter((id) => id !== employeeId));
    } else {
      onChange([...value, employeeId]);
    }
  };

  const handleRemove = (employeeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((id) => id !== employeeId));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[40px] px-3 py-2 border border-border rounded-md bg-card cursor-pointer flex items-center flex-wrap gap-1.5 hover:border-gray-400 transition-colors"
      >
        {selectedEmployees.length === 0 ? (
          <span className="text-muted-foreground text-sm">{placeholder}</span>
        ) : (
          selectedEmployees.map((emp) => (
            <Badge
              key={emp.id}
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
              {getDisplayName(emp)}
              <button
                type="button"
                onClick={(e) => handleRemove(emp.id, e)}
                className="ml-1 hover:bg-accent rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))
        )}
        <ChevronDown
          className={`w-4 h-4 ml-auto text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {employees.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p>No active employees found.</p>
              <p className="text-xs mt-1">Add employees in Settings</p>
            </div>
          ) : (
            employees.map((emp) => {
              const isSelected = value.includes(emp.id);
              return (
                <div
                  key={emp.id}
                  onClick={() => handleToggle(emp.id)}
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
                      {getDisplayName(emp)}
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
