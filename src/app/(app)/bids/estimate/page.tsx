"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { type ItemsCatalog } from "@/data/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calculator,
  Info,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Truck,
  Users,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

interface SelectedItem {
  catalogId: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  qty: number;
  pricingStrategy: "cost_plus" | "pre_marked";
}

// Hard costs are now pulled from the HardCost entity (active items only)

const UNIT_LABELS: Record<
  string,
  { singular: string; plural: string; per: string }
> = {
  ea: { singular: "unit", plural: "units", per: "each" },
  sq_ft: { singular: "sq ft", plural: "sq ft", per: "per sq ft" },
  ton: { singular: "ton", plural: "tons", per: "per ton" },
  hr: { singular: "hour", plural: "hours", per: "per hour" },
  other: { singular: "unit", plural: "units", per: "each" },
};

function uLabel(unit: string, qty: number) {
  const u = UNIT_LABELS[unit] || UNIT_LABELS.other;
  return qty === 1 ? u.singular : u.plural;
}

function pLabel(unit: string) {
  return (UNIT_LABELS[unit] || UNIT_LABELS.other).per;
}

function fmt(n: number) {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* ------------------------------------------------------------------ */
/* NumericInput — no spinners, no scroll, clear-on-focus, 0-on-blur   */
/* ------------------------------------------------------------------ */

function NumericInput({
  value,
  onChange,
  className,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay(String(value));
  }, [value, focused]);

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        type="text"
        inputMode="decimal"
        className={cn(className, prefix && "pl-7", suffix && "pr-8")}
        value={display}
        onFocus={(e) => {
          setFocused(true);
          if (value === 0) setDisplay("");
          e.target.select();
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" || /^\d*\.?\d*$/.test(raw)) {
            setDisplay(raw);
            onChange(raw === "" ? 0 : parseFloat(raw) || 0);
          }
        }}
        onBlur={() => {
          setFocused(false);
          if (display === "" || display === ".") {
            setDisplay("0");
            onChange(0);
          } else {
            setDisplay(String(parseFloat(display) || 0));
          }
        }}
        onWheel={(e) => (e.target as HTMLElement).blur()}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LiveEstimatePage() {
  const { currentCompanyId } = useCompany();

  const { data: catalogItems = [] } = useQuery({
    queryKey: ["items-catalog", currentCompanyId],
    queryFn: () => db.ItemsCatalog.filter({ company_id: currentCompanyId }),
  });

  const { data: hardCostItems = [] } = useQuery({
    queryKey: ["hard-costs-estimate", currentCompanyId],
    queryFn: async () => {
      const all = await db.HardCost.filter({ company_id: currentCompanyId });
      return all.filter((hc) => hc.is_active);
    },
  });

  /* ---- state ---- */
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [crewSize, setCrewSize] = useState(2);
  const [workingDays, setWorkingDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [hardCostsOn, setHardCostsOn] = useState(false);
  const [hardCostDays, setHardCostDays] = useState(1);
  const [markup, setMarkup] = useState(0);
  const [markupPreMarked, setMarkupPreMarked] = useState(false);
  const [misc, setMisc] = useState(0);
  const [configItem, setConfigItem] = useState<ItemsCatalog | null>(null);
  const [configQty, setConfigQty] = useState(1);

  /* ---- derived ---- */
  const availableItems = useMemo(() => {
    const ids = new Set(selectedItems.map((s) => s.catalogId));
    return catalogItems.filter((c) => !ids.has(c.id));
  }, [catalogItems, selectedItems]);

  const costPlusTotal = useMemo(
    () =>
      selectedItems
        .filter((i) => i.pricingStrategy === "cost_plus")
        .reduce((s, i) => s + i.qty * i.unitPrice, 0),
    [selectedItems],
  );

  const preMarkedTotal = useMemo(
    () =>
      selectedItems
        .filter((i) => i.pricingStrategy === "pre_marked")
        .reduce((s, i) => s + i.qty * i.unitPrice, 0),
    [selectedItems],
  );

  const itemsTotal = costPlusTotal + preMarkedTotal;

  const laborTotal = crewSize * workingDays * hoursPerDay * hourlyRate;

  const hardCosts = useMemo(
    () =>
      hardCostItems.map((hc) => {
        const daily = (hc.monthly_cost || 0) / 30;
        return { name: hc.name, monthlyCost: hc.monthly_cost || 0, daily, total: daily * hardCostDays };
      }),
    [hardCostItems, hardCostDays],
  );

  const hardCostsTotal = hardCostsOn
    ? hardCosts.reduce((s, hc) => s + hc.total, 0)
    : 0;

  const internalCost = itemsTotal + laborTotal + hardCostsTotal;

  // Global markup applies to cost-plus items, labor, and hard costs.
  // Pre-marked items only get markup if explicitly enabled.
  const markupMultiplier = 1 + markup / 100;
  const markedUpBase = (costPlusTotal + laborTotal + hardCostsTotal) * markupMultiplier;
  const markedUpPreMarked = markupPreMarked
    ? preMarkedTotal * markupMultiplier
    : preMarkedTotal;
  const customerPrice = markedUpBase + markedUpPreMarked + misc;

  /* ---- handlers ---- */
  const addItem = () => {
    if (!configItem) return;
    const isPM = (configItem.pricing_strategy || "cost_plus") === "pre_marked";
    setSelectedItems((prev) => [
      ...prev,
      {
        catalogId: configItem.id,
        name: configItem.name,
        category: configItem.category || "",
        unit: configItem.unit,
        // Pre-marked items use the sell price; cost-plus items use cost
        unitPrice: isPM
          ? configItem.default_sell_price || 0
          : configItem.default_unit_cost || 0,
        qty: configQty,
        pricingStrategy: configItem.pricing_strategy || "cost_plus",
      },
    ]);
    setConfigItem(null);
    setConfigQty(1);
  };

  const removeItem = (catalogId: string) =>
    setSelectedItems((prev) => prev.filter((i) => i.catalogId !== catalogId));

  /* ---- render ---- */
  return (
    <div className="max-w-full">
      {/* ========================================================== */}
      {/* STICKY PRICING BAR                                         */}
      {/* ========================================================== */}
      <div className="sticky top-0 z-30 px-4 sm:px-6 md:px-8 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Internal Cost */}
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-0.5">
                Internal Cost
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {fmt(internalCost)}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-blue-600/80 dark:text-blue-400/70">
                {costPlusTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Items (Cost-Plus)</span>
                    <span>{fmt(costPlusTotal)}</span>
                  </div>
                )}
                {preMarkedTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Items (Market Priced)</span>
                    <span>{fmt(preMarkedTotal)}</span>
                  </div>
                )}
                {costPlusTotal === 0 && preMarkedTotal === 0 && (
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span>{fmt(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Labor</span>
                  <span>{fmt(laborTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hard Costs</span>
                  <span>{fmt(hardCostsTotal)}</span>
                </div>
              </div>
            </div>

            {/* Customer Price */}
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-0.5">
                Customer Price
              </p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {fmt(customerPrice)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-green-600/80 dark:text-green-400/70">
                    Markup
                  </Label>
                  <NumericInput
                    value={markup}
                    onChange={setMarkup}
                    suffix="%"
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-green-600/80 dark:text-green-400/70">
                    Misc
                  </Label>
                  <NumericInput
                    value={misc}
                    onChange={setMisc}
                    prefix="$"
                    className="h-8 text-sm mt-0.5"
                  />
                </div>
              </div>
              {preMarkedTotal > 0 && markup > 0 && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Label className="text-[11px] text-green-600/80 dark:text-green-400/70 leading-tight">
                    Apply markup to market-priced items
                  </Label>
                  <Switch
                    checked={markupPreMarked}
                    onCheckedChange={setMarkupPreMarked}
                    className="scale-75"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="p-4 sm:p-6 md:p-8 pt-6">
        <div className="max-w-4xl mx-auto min-w-0">
          {/* Page header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Live Estimating
              </h1>
              <p className="text-sm text-muted-foreground">
                Build and price jobs in real time
              </p>
            </div>
          </div>

        <div className="space-y-6">
          {/* ======================================================== */}
          {/* SELECTED ITEMS                                           */}
          {/* ======================================================== */}
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-blue-500 to-blue-600 pb-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <ShoppingCart className="w-5 h-5" />
                Selected Items
              </CardTitle>
              <p className="text-sm text-blue-100">Tap an item to remove it</p>
            </CardHeader>
            <CardContent className="pt-4">
              {selectedItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No items selected yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <button
                      key={item.catalogId}
                      type="button"
                      onClick={() => removeItem(item.catalogId)}
                      className="w-full text-left rounded-xl border border-border bg-card hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-800/40 transition-colors p-3 group"
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors truncate">
                              {item.name}
                            </p>
                            {item.pricingStrategy === "pre_marked" && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 flex-shrink-0">
                                Market Priced
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.qty} {uLabel(item.unit, item.qty)} &middot;{" "}
                            {fmt(item.unitPrice)} {pLabel(item.unit)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                          <span className="font-semibold text-foreground">
                            {fmt(item.qty * item.unitPrice)}
                          </span>
                          <X className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </button>
                  ))}

                  <Separator className="my-3" />

                  <div className="flex justify-between items-center px-1">
                    <span className="font-semibold text-foreground">
                      Items Total
                    </span>
                    <span className="text-lg font-bold text-foreground">
                      {fmt(itemsTotal)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ======================================================== */}
          {/* AVAILABLE ITEMS                                          */}
          {/* ======================================================== */}
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Available Items
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tap an item to add it
              </p>
            </CardHeader>
            <CardContent className="pt-4 max-h-[420px] overflow-y-auto">
              {availableItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm">All items have been added</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableItems.map((item) => {
                    const isPM = (item.pricing_strategy || "cost_plus") === "pre_marked";
                    const displayPrice = isPM
                      ? item.default_sell_price || 0
                      : item.default_unit_cost || 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setConfigItem(item);
                          setConfigQty(1);
                        }}
                        className="w-full text-left rounded-xl border border-border bg-card hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-300 dark:hover:border-green-800/40 transition-colors p-3 group"
                      >
                        <div className="flex justify-between items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors truncate">
                                {item.name}
                              </p>
                              {isPM && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 flex-shrink-0">
                                  Market Priced
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {fmt(displayPrice)} {pLabel(item.unit)}
                            </p>
                          </div>
                          <span className="font-semibold text-foreground flex-shrink-0 ml-3">
                            {fmt(displayPrice)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ======================================================== */}
          {/* CREW & LABOR                                             */}
          {/* ======================================================== */}
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Crew &amp; Labor
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter crew size and time details
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Crew Size</Label>
                  <NumericInput
                    value={crewSize}
                    onChange={setCrewSize}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Working Days</Label>
                  <NumericInput
                    value={workingDays}
                    onChange={setWorkingDays}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Hours per Day</Label>
                  <NumericInput
                    value={hoursPerDay}
                    onChange={setHoursPerDay}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Hourly Rate</Label>
                  <NumericInput
                    value={hourlyRate}
                    onChange={setHourlyRate}
                    prefix="$"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center px-1">
                <span className="font-semibold text-foreground">
                  Labor Total
                </span>
                <span className="text-lg font-bold text-foreground">
                  {fmt(laborTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ======================================================== */}
          {/* HARD COSTS                                               */}
          {/* ======================================================== */}
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Hard Costs
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add additional non-labor costs to this bid
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-muted-foreground">
                    {hardCostsOn ? "On" : "Off"}
                  </span>
                  <Switch
                    checked={hardCostsOn}
                    onCheckedChange={setHardCostsOn}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 relative min-h-[280px]">
              {/* OFF overlay */}
              {!hardCostsOn && (
                <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-[2px] flex items-center justify-center rounded-b-xl">
                  <div className="text-center px-6 max-w-sm">
                    <Truck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-semibold text-foreground mb-2">
                      Hard Costs are turned off
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Turn this on to include overhead costs like equipment,
                      insurance, and delivery in your estimate. When off, all
                      hard costs are excluded and set to $0.
                    </p>
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "space-y-4 transition-opacity",
                  !hardCostsOn &&
                    "opacity-20 pointer-events-none select-none",
                )}
              >
                {/* Days input */}
                <div>
                  <Label className="text-sm font-medium">
                    Job Duration for Hard Costs (Days)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    How many days this job will use overhead costs like
                    equipment, insurance, and delivery
                  </p>
                  <NumericInput
                    value={hardCostDays}
                    onChange={setHardCostDays}
                    className="max-w-[200px]"
                  />
                </div>

                <Separator />

                {/* Hard cost rows */}
                <div className="space-y-2">
                  {hardCosts.map((hc) => (
                    <div
                      key={hc.name}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">
                            {hc.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ${hc.monthlyCost.toLocaleString()}/mo &rarr;{" "}
                            {fmt(hc.daily)}/day &times; {hardCostDays}{" "}
                            {hardCostDays === 1 ? "day" : "days"}
                          </p>
                        </div>
                        <span className="font-semibold text-foreground flex-shrink-0 ml-3">
                          {fmt(hc.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info box */}
                <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 p-3 flex gap-2.5">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    <span className="font-semibold">Calculation:</span> Monthly
                    costs are divided by 30 to determine daily rates, then
                    multiplied by the number of working days. This allows you to
                    fairly allocate overhead costs per job.
                  </p>
                </div>

                <Separator />

                <div className="flex justify-between items-center px-1">
                  <span className="font-semibold text-foreground">
                    Hard Costs Total
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {fmt(
                      hardCostsOn
                        ? hardCosts.reduce((s, h) => s + h.total, 0)
                        : 0,
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ======================================================== */}
          {/* CREATE BID BUTTON                                        */}
          {/* ======================================================== */}
          <Button
            className="w-full py-6 text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
            onClick={() =>
              toast.info(
                "Estimate snapshot ready — bid creation coming soon.",
              )
            }
          >
            Create Bid from Estimate
          </Button>

          <div className="h-4" />
        </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ITEM CONFIGURATION MODAL                                     */}
      {/* ============================================================ */}
      <Dialog
        open={!!configItem}
        onOpenChange={(open) => {
          if (!open) {
            setConfigItem(null);
            setConfigQty(1);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{configItem?.name}</DialogTitle>
          </DialogHeader>

          {configItem && (() => {
            const isPM = (configItem.pricing_strategy || "cost_plus") === "pre_marked";
            const unitPrice = isPM
              ? configItem.default_sell_price || 0
              : configItem.default_unit_cost || 0;

            return (
              <div className="py-2 space-y-5">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {fmt(unitPrice)} {pLabel(configItem.unit)}
                  </p>
                  {isPM && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400">
                      Market Priced
                    </span>
                  )}
                </div>

                {/* Quantity controls */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Quantity
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full flex-shrink-0"
                      disabled={configQty <= 1}
                      onClick={() => setConfigQty((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <NumericInput
                      value={configQty}
                      onChange={(v) => setConfigQty(Math.max(0, v))}
                      className="w-24 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full flex-shrink-0"
                      onClick={() => setConfigQty((q) => q + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Live total */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {configQty} {uLabel(configItem.unit, configQty)} &times;{" "}
                    {fmt(unitPrice)}
                  </span>
                  <span className="text-xl font-bold text-foreground">
                    {fmt(configQty * unitPrice)}
                  </span>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setConfigItem(null);
                setConfigQty(1);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={configQty <= 0}
              onClick={addItem}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
            >
              Add to Estimate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
