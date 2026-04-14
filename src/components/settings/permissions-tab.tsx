"use client";

import { db } from "@/data/api";
import { RolePermission } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield } from "lucide-react";

const PERMISSION_LIST = [
  { key: "contacts:read", label: "View Contacts" },
  { key: "contacts:write", label: "Edit Contacts" },
  { key: "contacts:delete", label: "Delete Contacts" },
  { key: "projects:read", label: "View Projects" },
  { key: "projects:write", label: "Edit Projects" },
  { key: "projects:delete", label: "Delete Projects" },
  { key: "bids:read", label: "View Bids" },
  { key: "bids:write", label: "Edit Bids" },
  { key: "bids:delete", label: "Delete Bids" },
  { key: "payments:read", label: "View Payments" },
  { key: "payments:write", label: "Process Payments" },
  { key: "maintenance:read", label: "View Maintenance" },
  { key: "maintenance:write", label: "Edit Maintenance" },
  { key: "maintenance:delete", label: "Delete Maintenance" },
  { key: "employees:read", label: "View Employees" },
  { key: "employees:write", label: "Edit Employees" },
  { key: "employees:delete", label: "Delete Employees" },
  { key: "schedule:read", label: "View Schedule" },
  { key: "schedule:write", label: "Edit Schedule" },
  { key: "settings:read", label: "View Settings" },
  { key: "settings:write", label: "Edit Settings" },
  { key: "reports:read", label: "View Reports" },
];

interface PermissionsTabProps {
  permissions: RolePermission[];
  onPermissionsChange: (permissions: RolePermission[]) => void;
}

export function PermissionsTab({
  permissions,
  onPermissionsChange,
}: PermissionsTabProps) {
  const handleToggle = async (
    role: RolePermission["role"],
    permKey: string,
    enabled: boolean
  ) => {
    const rolePerms = permissions.find((p) => p.role === role);
    if (!rolePerms) return;

    let newPerms: string[];
    if (enabled) {
      newPerms = [...rolePerms.permissions, permKey];
    } else {
      newPerms = rolePerms.permissions.filter((p) => p !== permKey);
    }

    const updated = await db.RolePermission.update(rolePerms.id, {
      permissions: newPerms,
    });
    if (updated) {
      onPermissionsChange(
        permissions.map((p) => (p.id === rolePerms.id ? updated : p))
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Role-Based Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead className="w-[200px]">Permission</TableHead>
                  <TableHead className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
                    >
                      Admin
                    </Badge>
                  </TableHead>
                  <TableHead className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                    >
                      Manager
                    </Badge>
                  </TableHead>
                  <TableHead className="text-center">
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400"
                    >
                      Employee
                    </Badge>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSION_LIST.map((perm) => (
                  <TableRow key={perm.key}>
                    <TableCell className="font-medium text-sm">
                      {perm.label}
                    </TableCell>
                    {(["admin", "manager", "employee"] as const).map(
                      (role) => {
                        const rolePerms = permissions.find(
                          (p) => p.role === role
                        );
                        const enabled =
                          rolePerms?.permissions.includes(perm.key) ?? false;
                        return (
                          <TableCell key={role} className="text-center">
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                handleToggle(role, perm.key, checked)
                              }
                              disabled={role === "admin"}
                            />
                          </TableCell>
                        );
                      }
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
