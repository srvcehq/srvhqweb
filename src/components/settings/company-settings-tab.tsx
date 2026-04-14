"use client";

import { CompanySetting } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, DollarSign, Save, Loader2 } from "lucide-react";

interface CompanySettingsTabProps {
  settings: CompanySetting;
  saving: boolean;
  hasChanges: boolean;
  onSettingChange: (field: string, value: string | number) => void;
  onSave: () => void;
}

export function CompanySettingsTab({
  settings,
  saving,
  hasChanges,
  onSettingChange,
  onSave,
}: CompanySettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={onSave}
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
                onSettingChange("company_name", e.target.value)
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
                onSettingChange("logo_url", e.target.value)
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
                  onSettingChange(
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
                  onSettingChange(
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
                  onSettingChange(
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
                  onSettingChange(
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
                onSettingChange("labor_cost_mode", val)
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
    </div>
  );
}
