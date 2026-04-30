"use client";

import React, { useState } from "react";
import { db } from "@/data/api";
import {
  CompanySetting,
  Employee,
  Team,
  RolePermission,
} from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, Users, Palette, Shield, CreditCard } from "lucide-react";

import { CompanySettingsTab } from "@/components/settings/company-settings-tab";
import { EmployeeManagementTab } from "@/components/settings/employee-management-tab";
import { TeamManagementTab } from "@/components/settings/team-management-tab";
import { PermissionsTab } from "@/components/settings/permissions-tab";
import { StripeTab } from "@/components/settings/stripe-tab";

export default function SettingsPage() {
  const { currentCompanyId } = useCompany();

  const [settings, setSettings] = useState<CompanySetting | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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

  if (loading || !settings) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const tabTriggerActive =
    "data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white";

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your business preferences</p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card border border-border shadow-sm">
            <TabsTrigger value="company" className={tabTriggerActive}>
              <Building2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className={tabTriggerActive}>
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Employees</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className={tabTriggerActive}>
              <Palette className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Teams</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className={tabTriggerActive}>
              <Shield className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="stripe" className={tabTriggerActive}>
              <CreditCard className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Stripe</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <CompanySettingsTab
              settings={settings}
              saving={saving}
              hasChanges={hasChanges}
              onSettingChange={handleSettingChange}
              onSave={handleSaveSettings}
            />
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeManagementTab
              employees={employees}
              companyId={currentCompanyId}
              onEmployeesChange={setEmployees}
            />
          </TabsContent>

          <TabsContent value="teams">
            <TeamManagementTab
              teams={teams}
              employees={employees}
              companyId={currentCompanyId}
              onTeamsChange={setTeams}
            />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsTab
              permissions={permissions}
              onPermissionsChange={setPermissions}
            />
          </TabsContent>

          <TabsContent value="stripe">
            <StripeTab settings={settings} onSettingsChange={setSettings} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
