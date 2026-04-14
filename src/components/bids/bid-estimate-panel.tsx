"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, Loader2 } from "lucide-react";

export interface EstimateData {
  directCostSubtotal: number;
  overheadTotal: number;
  profitAmount: number;
  bidTotal: number;
  depositAmount: number;
  laborTotal: number;
}

interface BidEstimatePanelProps {
  estimate: EstimateData;
  onCreateBid: () => void;
  isSaving: boolean;
  compact?: boolean;
}

function fmt(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BidEstimatePanel({
  estimate,
  onCreateBid,
  isSaving,
  compact = false,
}: BidEstimatePanelProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Bid Total</span>
            <span className="text-lg font-bold text-foreground">
              {fmt(estimate.bidTotal)}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreateBid();
          }}
          disabled={isSaving}
          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Bid"}
        </Button>
      </div>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          Live Estimate
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <Row label="Direct Costs" value={fmt(estimate.directCostSubtotal)} />
        <Row label="Overhead" value={fmt(estimate.overheadTotal)} />
        <Row
          label="Subtotal"
          value={fmt(estimate.directCostSubtotal + estimate.overheadTotal)}
          muted
        />
        <Row label="Profit" value={fmt(estimate.profitAmount)} highlight />

        <Separator />

        <div className="flex justify-between items-center py-1">
          <span className="font-semibold text-foreground">Bid Total</span>
          <span className="text-2xl font-bold text-green-600">
            {fmt(estimate.bidTotal)}
          </span>
        </div>

        <Separator />

        <Row label="Deposit" value={fmt(estimate.depositAmount)} />
        <Row label="Labor Est." value={fmt(estimate.laborTotal)} muted />

        <Button
          onClick={onCreateBid}
          disabled={isSaving}
          className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Create Bid from Estimate"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>
        {label}
      </span>
      <span
        className={
          highlight
            ? "font-semibold text-green-600"
            : muted
              ? "text-muted-foreground"
              : "font-medium text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
