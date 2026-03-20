"use client";

import React, { useState, useMemo } from "react";
import { db } from "@/data/api";
import {
  CompanySetting,
  Employee,
  Team,
  RolePermission,
} from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Building2,
  Users,
  DollarSign,
  Save,
  Loader2,
  Shield,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Palette,
} from "lucide-react";

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

export default function SettingsPage() {
  const { currentCompanyId } = useCompany();

  const [settings, setSettings] = useState<CompanySetting | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Employee dialog
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "employee" as Employee["role"],
    hourly_rate: 20,
    color: "#22c55e",
  });

  // Team dialog
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    color: "#22c55e",
  });

  // Delete confirmations
  const [pendingDeleteEmployee, setPendingDeleteEmployee] = useState<Employee | null>(null);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState<Team | null>(null);

  // Load data on mount
  React.useEffect(() => {
    async function load() {
      const [settingsList, empList, teamList, permList] = await Promise.all([
        db.CompanySetting.filter({ company_id: currentCompanyId }),
        db.Employee.filter({ company_id: currentCompanyId }),
        db.Team.filter({ company_id: currentCompanyId }),
        db.RolePermission.filter({ company_id: currentCompanyId }),
      ]);
      if (settingsList.length > 0) {
        setSettings(settingsList[0]);
      } else {
        setSettings({
          id: "new",
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          company_id: currentCompanyId,
          company_name: "",
          logo_url: "",
          crews_total: 0,
          crew_size_per_team: 0,
          default_hourly_wage: 20,
          default_hours_per_day: 8,
          labor_cost_mode: "overhead",
        });
      }
      setEmployees(empList);
      setTeams(teamList);
      setPermissions(permList);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  // Save company settings
  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      if (settings.id === "new") {
        const created = await db.CompanySetting.create({
          ...settings,
          company_id: currentCompanyId,
        });
        setSettings(created);
      } else {
        await db.CompanySetting.update(settings.id, settings);
      }
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (field: string, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setHasChanges(true);
  };

  // Employee CRUD
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "employee",
      hourly_rate: 20,
      color: "#22c55e",
    });
    setShowEmployeeDialog(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email || "",
      phone: emp.phone || "",
      role: emp.role,
      hourly_rate: emp.hourly_rate || 20,
      color: emp.color || "#22c55e",
    });
    setShowEmployeeDialog(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...employeeForm,
      display_name: `${employeeForm.first_name} ${employeeForm.last_name}`,
      status: "active" as const,
      company_id: currentCompanyId,
    };

    if (editingEmployee) {
      const updated = await db.Employee.update(editingEmployee.id, data);
      if (updated) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === editingEmployee.id ? updated : e))
        );
      }
    } else {
      const created = await db.Employee.create(data);
      setEmployees((prev) => [...prev, created]);
    }
    setShowEmployeeDialog(false);
  };

  const handleDeleteEmployee = async () => {
    if (!pendingDeleteEmployee) return;
    await db.Employee.delete(pendingDeleteEmployee.id);
    setEmployees((prev) =>
      prev.filter((e) => e.id !== pendingDeleteEmployee!.id)
    );
    setPendingDeleteEmployee(null);
  };

  // Team CRUD
  const handleAddTeam = () => {
    setEditingTeam(null);
    setTeamForm({ name: "", color: "#22c55e" });
    setShowTeamDialog(true);
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name,
      color: team.color || "#22c55e",
    });
    setShowTeamDialog(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...teamForm, company_id: currentCompanyId };

    if (editingTeam) {
      const updated = await db.Team.update(editingTeam.id, data);
      if (updated) {
        setTeams((prev) =>
          prev.map((t) => (t.id === editingTeam.id ? updated : t))
        );
      }
    } else {
      const created = await db.Team.create(data);
      setTeams((prev) => [...prev, created]);
    }
    setShowTeamDialog(false);
  };

  const handleDeleteTeam = async () => {
    if (!pendingDeleteTeam) return;
    await db.Team.delete(pendingDeleteTeam.id);
    setTeams((prev) => prev.filter((t) => t.id !== pendingDeleteTeam!.id));
    setPendingDeleteTeam(null);
  };

  // Permission toggle
  const handlePermissionToggle = async (
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
      setPermissions((prev) =>
        prev.map((p) => (p.id === rolePerms.id ? updated : p))
      );
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your business preferences</p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card border border-border shadow-sm">
            <TabsTrigger
              value="company"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Building2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger
              value="employees"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Employees</span>
            </TabsTrigger>
            <TabsTrigger
              value="teams"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Palette className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger
              value="stripe"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Stripe</span>
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={!hasChanges || saving}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={settings.company_name || ""}
                    onChange={(e) =>
                      handleSettingChange("company_name", e.target.value)
                    }
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={settings.logo_url || ""}
                    onChange={(e) =>
                      handleSettingChange("logo_url", e.target.value)
                    }
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Labor Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="crews_total">Total Crews</Label>
                    <Input
                      id="crews_total"
                      type="number"
                      min="0"
                      value={settings.crews_total || 0}
                      onChange={(e) =>
                        handleSettingChange(
                          "crews_total",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crew_size">Crew Size Per Team</Label>
                    <Input
                      id="crew_size"
                      type="number"
                      min="0"
                      value={settings.crew_size_per_team || 0}
                      onChange={(e) =>
                        handleSettingChange(
                          "crew_size_per_team",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_wage">Default Hourly Wage ($)</Label>
                    <Input
                      id="hourly_wage"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.default_hourly_wage || 0}
                      onChange={(e) =>
                        handleSettingChange(
                          "default_hourly_wage",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours_day">Hours Per Day</Label>
                    <Input
                      id="hours_day"
                      type="number"
                      min="0"
                      value={settings.default_hours_per_day || 0}
                      onChange={(e) =>
                        handleSettingChange(
                          "default_hours_per_day",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Labor Cost Mode</Label>
                  <Select
                    value={settings.labor_cost_mode || "overhead"}
                    onValueChange={(val) =>
                      handleSettingChange("labor_cost_mode", val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overhead">
                        Overhead (included in overhead %)
                      </SelectItem>
                      <SelectItem value="line_item">
                        Line Item (separate line on bid)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={handleAddEmployee}
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
                              {emp.email || "—"}
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
                              ${emp.hourly_rate?.toFixed(2) || "—"}
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
                                  onClick={() => handleEditEmployee(emp)}
                                >
                                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-red-50"
                                  onClick={() => setPendingDeleteEmployee(emp)}
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
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="flex justify-end">
              <Button
                onClick={handleAddTeam}
                className="bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
            </div>

            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-green-600" />
                  Teams
                  <Badge variant="outline" className="ml-2">
                    {teams.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {teams.length === 0 ? (
                  <div className="p-12 text-center">
                    <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No teams yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {teams.map((team) => {
                      const memberCount = employees.filter(
                        (e) => e.team_id === team.id
                      ).length;
                      const lead = team.lead_id
                        ? employees.find((e) => e.id === team.lead_id)
                        : null;

                      return (
                        <div
                          key={team.id}
                          className="p-4 flex items-center justify-between hover:bg-accent"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                              style={{
                                backgroundColor: team.color || "#22c55e",
                              }}
                            >
                              {team.name[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {team.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {memberCount} member
                                {memberCount !== 1 ? "s" : ""}
                                {lead && (
                                  <span className="ml-2">
                                    Lead: {lead.first_name} {lead.last_name}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-blue-50"
                              onClick={() => handleEditTeam(team)}
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-red-50"
                              onClick={() => setPendingDeleteTeam(team)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
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
                                      handlePermissionToggle(role, perm.key, checked)
                                    }
                                    disabled={role === "admin"} // Admin always has all permissions
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
          </TabsContent>

          {/* Stripe Tab */}
          <TabsContent value="stripe" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  Stripe Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-semibold text-foreground">Connection Status</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.stripe_connect_account_id
                        ? "Connected to Stripe"
                        : "Not connected"}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      settings.stripe_connect_status === "active"
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-400"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-400"
                    }
                  >
                    {settings.stripe_connect_status === "active"
                      ? "Active"
                      : "Not Connected"}
                  </Badge>
                </div>

                {settings.stripe_connect_account_id && (
                  <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800/40 rounded-lg">
                    <p className="text-sm text-green-700">
                      Account ID:{" "}
                      <code className="font-mono bg-green-100 px-1 py-0.5 rounded">
                        {settings.stripe_connect_account_id}
                      </code>
                    </p>
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Payment Processing
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Stripe account to accept payments from clients via
                    credit card or ACH bank transfer.
                  </p>
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => {
                      // Mock - in production would redirect to Stripe OAuth
                      alert("This would redirect to Stripe Connect OAuth flow");
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {settings.stripe_connect_account_id
                      ? "Manage Connection"
                      : "Connect Stripe Account"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Employee Dialog */}
      <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEmployee} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={employeeForm.first_name}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, first_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={employeeForm.last_name}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, last_name: e.target.value })
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
                  value={employeeForm.email}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={employeeForm.phone}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={employeeForm.role}
                  onValueChange={(val) =>
                    setEmployeeForm({
                      ...employeeForm,
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
                  value={employeeForm.hourly_rate}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      hourly_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={employeeForm.color}
                  onChange={(e) =>
                    setEmployeeForm({ ...employeeForm, color: e.target.value })
                  }
                  className="h-10 p-1 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmployeeDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {editingEmployee ? "Update" : "Add"} Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingTeam ? "Edit Team" : "Add Team"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTeam} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, name: e.target.value })
                }
                placeholder="e.g., Alpha Crew"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Team Color</Label>
              <Input
                type="color"
                value={teamForm.color}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, color: e.target.value })
                }
                className="h-10 p-1 cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTeamDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {editingTeam ? "Update" : "Add"} Team
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation */}
      <AlertDialog
        open={!!pendingDeleteEmployee}
        onOpenChange={(open) => !open && setPendingDeleteEmployee(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {pendingDeleteEmployee?.first_name}{" "}
              {pendingDeleteEmployee?.last_name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteEmployee(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEmployee}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Team Confirmation */}
      <AlertDialog
        open={!!pendingDeleteTeam}
        onOpenChange={(open) => !open && setPendingDeleteTeam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{pendingDeleteTeam?.name}&quot;?
              Team members will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteTeam(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
