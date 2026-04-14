"use client";

import React, { useState } from "react";
import { db } from "@/data/api";
import { Employee } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";

interface EmployeeManagementTabProps {
  employees: Employee[];
  companyId: string;
  onEmployeesChange: (employees: Employee[]) => void;
}

const DEFAULT_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "employee" as Employee["role"],
  hourly_rate: 20,
  color: "#22c55e",
};

export function EmployeeManagementTab({
  employees,
  companyId,
  onEmployeesChange,
}: EmployeeManagementTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowDialog(true);
  };

  const handleEdit = (emp: Employee) => {
    setEditing(emp);
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email || "",
      phone: emp.phone || "",
      role: emp.role,
      hourly_rate: emp.hourly_rate || 20,
      color: emp.color || "#22c55e",
    });
    setShowDialog(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      display_name: `${form.first_name} ${form.last_name}`,
      status: "active" as const,
      company_id: companyId,
    };

    if (editing) {
      const updated = await db.Employee.update(editing.id, data);
      if (updated) {
        onEmployeesChange(
          employees.map((emp) => (emp.id === editing.id ? updated : emp))
        );
      }
    } else {
      const created = await db.Employee.create(data);
      onEmployeesChange([...employees, created]);
    }
    setShowDialog(false);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    await db.Employee.delete(pendingDelete.id);
    onEmployeesChange(employees.filter((e) => e.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Employees
              <Badge variant="outline" className="ml-2">
                {employees.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {employees.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No employees yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: emp.color || "#22c55e",
                              }}
                            />
                            <span className="font-medium">
                              {emp.first_name} {emp.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {emp.email || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              emp.role === "admin"
                                ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400"
                                : emp.role === "manager"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400"
                            }
                          >
                            {emp.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-green-600">
                          ${emp.hourly_rate?.toFixed(2) || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              emp.status === "active"
                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-400"
                                : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400"
                            }
                          >
                            {emp.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-blue-50"
                              onClick={() => handleEdit(emp)}
                            >
                              <Pencil className="w-3.5 h-3.5 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-red-50"
                              onClick={() => setPendingDelete(emp)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Employee Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editing ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) =>
                    setForm({
                      ...form,
                      role: val as Employee["role"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.hourly_rate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm({ ...form, color: e.target.value })
                  }
                  className="h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {editing ? "Update" : "Add"} Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {pendingDelete?.first_name}{" "}
              {pendingDelete?.last_name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
