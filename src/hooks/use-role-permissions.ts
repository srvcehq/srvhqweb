"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import type { Employee, RolePermission, User } from "@/data/types";

// ---------------------------------------------------------------------------
// Default permissions by role
// ---------------------------------------------------------------------------

export interface Permissions {
  canViewSchedule: boolean;
  canEditSchedule: boolean;
  canViewRouteAssigner: boolean;
  canOptimizeRoutes: boolean;
  canAssignJobs: boolean;
  canViewAllJobs: boolean;
  canEditJobStatus: boolean;
  canAddNotesAndPhotos: boolean;
  canViewClientDetails: boolean;
}

const DEFAULT_PERMISSIONS: Permissions = {
  canViewSchedule: false,
  canEditSchedule: false,
  canViewRouteAssigner: false,
  canOptimizeRoutes: false,
  canAssignJobs: false,
  canViewAllJobs: false,
  canEditJobStatus: false,
  canAddNotesAndPhotos: false,
  canViewClientDetails: false,
};

// ---------------------------------------------------------------------------
// Mock auth: returns a hardcoded admin user for the demo environment
// ---------------------------------------------------------------------------

const MOCK_USER: User = {
  id: "user-1",
  email: "admin@terraflow.app",
  full_name: "Admin User",
  role: "admin",
};

function useMockAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulate async auth resolution
    setCurrentUser(MOCK_USER);
  }, []);

  return currentUser;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type AppRole = "admin" | "manager" | "employee";

export interface RolePermissionsResult {
  currentUser: User | null;
  currentEmployee: Employee | null;
  userRole: AppRole;
  permissions: Permissions;
  hasPermission: (permission: keyof Permissions) => boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

/**
 * Custom hook to fetch and manage role permissions.
 * Returns permissions for the current user's app role from their Employee record.
 *
 * In the mock/demo environment this uses a hardcoded admin user.
 */
export function useRolePermissions(): RolePermissionsResult {
  const currentUser = useMockAuth();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);

  // Fetch all employees to find current user's employee record
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => db.Employee.list(),
    enabled: !!currentUser,
  });

  // Fetch role permissions
  const { data: rolePermissions = [], isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => db.RolePermission.list(),
  });

  // Find current user's employee record by email
  useEffect(() => {
    if (currentUser && employees.length > 0) {
      const employee = employees.find((e) => e.email === currentUser.email) ?? null;
      setCurrentEmployee(employee);
    }
  }, [currentUser, employees]);

  // Resolve the user's app role
  const userRole: AppRole = (currentEmployee?.role as AppRole) || "admin";

  // Build permissions from the RolePermission entries or fall back to defaults.
  // The mock data stores permissions as a string array; we convert to the flat object.
  const roleEntry = rolePermissions.find((p: RolePermission) => p.role === userRole);
  const permissionsList: string[] = roleEntry?.permissions ?? [];

  const resolvedPermissions: Permissions = {
    ...DEFAULT_PERMISSIONS,
  };

  // If we have stored permission strings, map them to boolean flags
  if (permissionsList.length > 0) {
    for (const key of Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]) {
      resolvedPermissions[key] = permissionsList.includes(key);
    }
  } else if (userRole === "admin") {
    // Admin gets everything by default
    for (const key of Object.keys(DEFAULT_PERMISSIONS) as (keyof Permissions)[]) {
      resolvedPermissions[key] = true;
    }
  } else if (userRole === "manager") {
    // Managers get most permissions by default
    resolvedPermissions.canViewSchedule = true;
    resolvedPermissions.canEditSchedule = true;
    resolvedPermissions.canViewRouteAssigner = true;
    resolvedPermissions.canOptimizeRoutes = true;
    resolvedPermissions.canAssignJobs = true;
    resolvedPermissions.canViewAllJobs = true;
    resolvedPermissions.canEditJobStatus = true;
    resolvedPermissions.canAddNotesAndPhotos = true;
    resolvedPermissions.canViewClientDetails = true;
  }

  const hasPermission = (permission: keyof Permissions): boolean => {
    return resolvedPermissions[permission] ?? false;
  };

  return {
    currentUser,
    currentEmployee,
    userRole,
    permissions: resolvedPermissions,
    hasPermission,
    isLoading,
    isAdmin: userRole === "admin",
    isManager: userRole === "manager",
    isEmployee: userRole === "employee",
  };
}
