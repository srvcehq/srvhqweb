"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useCompany } from "./company-provider";

const STORAGE_KEY = "employeeViewMode";

// Permission keys
export const PERMISSIONS = {
  VIEW_SCHEDULE: "VIEW_SCHEDULE",
  EDIT_SCHEDULE: "EDIT_SCHEDULE",
  VIEW_ROUTE_ASSIGNER: "VIEW_ROUTE_ASSIGNER",
  OPTIMIZE_ROUTES: "OPTIMIZE_ROUTES",
  ASSIGN_JOBS: "ASSIGN_JOBS",
  VIEW_ALL_JOBS: "VIEW_ALL_JOBS",
  EDIT_JOB_STATUS: "EDIT_JOB_STATUS",
  ADD_NOTES_PHOTOS: "ADD_NOTES_PHOTOS",
  VIEW_CLIENT_DETAILS: "VIEW_CLIENT_DETAILS",
  VIEW_CONTACTS: "VIEW_CONTACTS",
  VIEW_CLIENT_MAP: "VIEW_CLIENT_MAP",
  VIEW_PROJECTS: "VIEW_PROJECTS",
  VIEW_MAINTENANCE_ITEMS: "VIEW_MAINTENANCE_ITEMS",
  VIEW_MAINTENANCE_PLANS: "VIEW_MAINTENANCE_PLANS",
  VIEW_BID_ITEMS: "VIEW_BID_ITEMS",
  VIEW_BIDS: "VIEW_BIDS",
  VIEW_DOOR_TO_DOOR: "VIEW_DOOR_TO_DOOR",
  PAYMENTS: "PAYMENTS",
  INVOICING: "INVOICING",
  FINANCIALS: "FINANCIALS",
  PRICING_PLANS: "PRICING_PLANS",
  COMPANY_SETTINGS: "COMPANY_SETTINGS",
  ROLE_PERMISSION_MANAGEMENT: "ROLE_PERMISSION_MANAGEMENT",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Permission allow-lists by role
const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  employee: new Set([
    PERMISSIONS.VIEW_SCHEDULE,
    PERMISSIONS.EDIT_JOB_STATUS,
    PERMISSIONS.ADD_NOTES_PHOTOS,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.VIEW_DOOR_TO_DOOR,
  ]),
  manager: new Set([
    PERMISSIONS.VIEW_SCHEDULE,
    PERMISSIONS.EDIT_SCHEDULE,
    PERMISSIONS.VIEW_ROUTE_ASSIGNER,
    PERMISSIONS.OPTIMIZE_ROUTES,
    PERMISSIONS.ASSIGN_JOBS,
    PERMISSIONS.VIEW_ALL_JOBS,
    PERMISSIONS.EDIT_JOB_STATUS,
    PERMISSIONS.ADD_NOTES_PHOTOS,
    PERMISSIONS.VIEW_CLIENT_DETAILS,
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.VIEW_CLIENT_MAP,
    PERMISSIONS.VIEW_PROJECTS,
    PERMISSIONS.VIEW_MAINTENANCE_ITEMS,
    PERMISSIONS.VIEW_MAINTENANCE_PLANS,
    PERMISSIONS.VIEW_BID_ITEMS,
    PERMISSIONS.VIEW_BIDS,
    PERMISSIONS.VIEW_DOOR_TO_DOOR,
  ]),
  admin: new Set(Object.values(PERMISSIONS)),
};

type EmployeeViewState = {
  isEmployeeViewMode: boolean;
  employeeViewEmployeeId: string | null;
  employeeViewRole: string;
  employeeViewName: string | null;
};

type Employee = {
  id: string;
  company_id?: string;
  app_role?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
};

type EmployeeViewModeContextValue = EmployeeViewState & {
  enterEmployeeViewMode: (employee: Employee) => void;
  exitEmployeeViewMode: () => void;
  hasPermission: (permissionKey: string) => boolean;
  effectiveRoleForView: string;
};

const EmployeeViewModeContext =
  createContext<EmployeeViewModeContextValue | null>(null);

export function EmployeeViewModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentCompanyId } = useCompany();
  const [state, setState] = useState<EmployeeViewState>({
    isEmployeeViewMode: false,
    employeeViewEmployeeId: null,
    employeeViewRole: "employee",
    employeeViewName: null,
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch (e) {
        console.warn("Failed to parse employee view mode state:", e);
      }
    }
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (state.isEmployeeViewMode) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  const enterEmployeeViewMode = (employee: Employee) => {
    // Validate employee belongs to current company
    if (employee.company_id && employee.company_id !== currentCompanyId) {
      console.error(
        "Cannot enter view mode for employee from different company"
      );
      return;
    }

    setState({
      isEmployeeViewMode: true,
      employeeViewEmployeeId: employee.id,
      employeeViewRole: employee.app_role || "employee",
      employeeViewName:
        employee.display_name ||
        `${employee.first_name} ${employee.last_name}`,
    });
  };

  const exitEmployeeViewMode = () => {
    setState({
      isEmployeeViewMode: false,
      employeeViewEmployeeId: null,
      employeeViewRole: "employee",
      employeeViewName: null,
    });
  };

  // Permission checker - returns true if the current role has the permission
  const hasPermission = (permissionKey: string): boolean => {
    // If not in testing mode, allow everything (admin behavior)
    if (!state.isEmployeeViewMode) {
      return true;
    }

    const effectiveRole = state.employeeViewRole || "employee";
    const allowedPermissions = ROLE_PERMISSIONS[effectiveRole];

    return allowedPermissions ? allowedPermissions.has(permissionKey) : false;
  };

  return (
    <EmployeeViewModeContext.Provider
      value={{
        ...state,
        enterEmployeeViewMode,
        exitEmployeeViewMode,
        hasPermission,
        effectiveRoleForView: state.isEmployeeViewMode
          ? state.employeeViewRole
          : "admin",
      }}
    >
      {children}
    </EmployeeViewModeContext.Provider>
  );
}

export function useEmployeeViewMode(): EmployeeViewModeContextValue {
  const context = useContext(EmployeeViewModeContext);
  if (!context) {
    throw new Error(
      "useEmployeeViewMode must be used within an EmployeeViewModeProvider"
    );
  }
  return context;
}
