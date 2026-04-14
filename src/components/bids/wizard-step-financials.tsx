"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, Clock, CreditCard } from "lucide-react";

interface WizardStepFinancialsProps {
  profitType: "percent" | "dollar";
  profitValue: number;
  laborWage: number;
  laborHoursPerDay: number;
  laborDays: number;
  depositType: "percent" | "dollar";
  depositValue: number;
  achEnabled: boolean;
  cardEnabled: boolean;
  computedProfitAmount: number;
  computedDepositAmount: number;
  computedLaborTotal: number;
  onProfitTypeChange: (v: "percent" | "dollar") => void;
  onProfitValueChange: (v: number) => void;
  onLaborWageChange: (v: number) => void;
  onLaborHoursPerDayChange: (v: number) => void;
  onLaborDaysChange: (v: number) => void;
  onDepositTypeChange: (v: "percent" | "dollar") => void;
  onDepositValueChange: (v: number) => void;
  onAchChange: (v: boolean) => void;
  onCardChange: (v: boolean) => void;
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WizardStepFinancials({
  profitType,
  profitValue,
  laborWage,
  laborHoursPerDay,
  laborDays,
  depositType,
  depositValue,
  achEnabled,
  cardEnabled,
  computedProfitAmount,
  computedDepositAmount,
  computedLaborTotal,
  onProfitTypeChange,
  onProfitValueChange,
  onLaborWageChange,
  onLaborHoursPerDayChange,
  onLaborDaysChange,
  onDepositTypeChange,
  onDepositValueChange,
  onAchChange,
  onCardChange,
}: WizardStepFinancialsProps) {
  return (
    <div className="space-y-6">
      {/* Profit */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Profit
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={profitType} onValueChange={(v) => onProfitTypeChange(v as "percent" | "dollar")}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="dollar">$</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={profitValue}
                onChange={(e) => onProfitValueChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-4 py-3">
            <span className="text-sm text-green-700 dark:text-green-400">Computed Profit</span>
            <span className="text-lg font-bold text-green-600">{fmt(computedProfitAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Labor Estimate */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Labor Estimate
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Hourly Wage</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborWage}
                  onChange={(e) => onLaborWageChange(parseFloat(e.target.value) || 0)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Hours/Day</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={laborHoursPerDay}
                onChange={(e) => onLaborHoursPerDayChange(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Est. Days</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={laborDays}
                onChange={(e) => onLaborDaysChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 px-4 py-3">
            <span className="text-sm text-blue-700 dark:text-blue-400">Labor Total</span>
            <span className="text-lg font-bold text-blue-600">{fmt(computedLaborTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Deposit & Payment */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            Deposit & Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-5">
          <div className="flex gap-3 items-end">
            <div className="space-y-2">
              <Label>Deposit Type</Label>
              <Select value={depositType} onValueChange={(v) => onDepositTypeChange(v as "percent" | "dollar")}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">%</SelectItem>
                  <SelectItem value="dollar">$</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={depositValue}
                onChange={(e) => onDepositValueChange(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3">
            <span className="text-sm text-amber-700 dark:text-amber-400">Deposit Amount</span>
            <span className="text-lg font-bold text-amber-600">{fmt(computedDepositAmount)}</span>
          </div>

          <div className="space-y-3 pt-2">
            <Label>Payment Methods</Label>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ach-enabled"
                  checked={achEnabled}
                  onCheckedChange={(checked) => onAchChange(checked === true)}
                />
                <Label htmlFor="ach-enabled" className="text-sm font-normal cursor-pointer">
                  ACH / Bank Transfer
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="card-enabled"
                  checked={cardEnabled}
                  onCheckedChange={(checked) => onCardChange(checked === true)}
                />
                <Label htmlFor="card-enabled" className="text-sm font-normal cursor-pointer">
                  Credit / Debit Card
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
