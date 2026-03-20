"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp } from "lucide-react";

interface BidKpiSummaryProps {
  finalPrice?: number;
  profit_if_misc_used?: number;
  profit_if_misc_not_used?: number;
  margin_on_cost_misc_used?: number | null;
  margin_on_revenue_not_used?: number | null;
}

/**
 * Three-card KPI summary for a bid: Final Price, Profit (misc used), Profit (misc not used).
 */
export default function BidKpiSummary({
  finalPrice = 0,
  profit_if_misc_used = 0,
  profit_if_misc_not_used = 0,
  margin_on_cost_misc_used = null,
  margin_on_revenue_not_used = null,
}: BidKpiSummaryProps) {
  // Zero-safe helpers
  const num = (v: unknown): number => {
    if (v === "" || v === null || v === undefined) return 0;
    const parsed = parseFloat(String(v));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const money = (v: unknown): string => {
    const n = num(v);
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPercent = (value: unknown): string => {
    const n = num(value);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : "\u2014";
  };

  // Apply zero-safe parsing
  const finalPriceSafe = num(finalPrice);
  const profitMiscUsedSafe = num(profit_if_misc_used);
  const profitMiscNotUsedSafe = num(profit_if_misc_not_used);

  // Margins (use provided or show em-dash)
  const marginCostUsed =
    margin_on_cost_misc_used !== null && margin_on_cost_misc_used !== undefined
      ? formatPercent(margin_on_cost_misc_used)
      : "\u2014";
  const marginRevNotUsed =
    margin_on_revenue_not_used !== null && margin_on_revenue_not_used !== undefined
      ? formatPercent(margin_on_revenue_not_used)
      : "\u2014";

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Final Price */}
      <Card className="shadow-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Final Price</span>
          </div>
          <p className="text-4xl font-bold text-green-600 mb-2">
            {money(finalPriceSafe)}
          </p>
          <p className="text-xs text-muted-foreground">Total bid amount</p>
        </CardContent>
      </Card>

      {/* Profit (if Misc Used) */}
      <Card className="shadow-lg border-2 border-blue-300">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-foreground">
              Profit (if Misc Used)
            </span>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">
            {money(profitMiscUsedSafe)}
          </p>
          <p className="text-xs text-muted-foreground mb-1">
            Assumes contingency/miscellaneous is fully spent.
          </p>
          {marginCostUsed !== "\u2014" && (
            <p className="text-xs text-blue-700 font-medium">
              Margin: {marginCostUsed} on cost
            </p>
          )}
        </CardContent>
      </Card>

      {/* Profit (if Misc Not Used) */}
      <Card className="shadow-lg border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-900">
              Profit (if Misc Not Used)
            </span>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mb-2">
            {money(profitMiscNotUsedSafe)}
          </p>
          <p className="text-xs text-muted-foreground mb-1">
            If contingency is not needed, it becomes additional profit.
          </p>
          {marginRevNotUsed !== "\u2014" && (
            <p className="text-xs text-emerald-700 font-medium">
              Margin: {marginRevNotUsed} on revenue
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
