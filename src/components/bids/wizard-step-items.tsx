"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Package, X, Layers, ShieldCheck, Loader2 } from "lucide-react";
import type { ItemsCatalog, OverheadTemplateLine } from "@/data/types";

export interface LineItemRow {
  id: string;
  item_name: string;
  category: string;
  unit: string;
  qty: number;
  unit_cost: number;
  sell_price: number;
}

export interface OverheadRow {
  id: string;
  name: string;
  type: "percent" | "dollar";
  value: number;
  enabled: boolean;
}

interface WizardStepItemsProps {
  lineItems: LineItemRow[];
  overheadItems: OverheadRow[];
  onLineItemsChange: (items: LineItemRow[]) => void;
  onOverheadChange: (items: OverheadRow[]) => void;
}

let rowIdCounter = 0;
function nextRowId() {
  return `row_${++rowIdCounter}`;
}

export default function WizardStepItems({
  lineItems,
  overheadItems,
  onLineItemsChange,
  onOverheadChange,
}: WizardStepItemsProps) {
  const { currentCompanyId } = useCompany();
  const [catalogOpen, setCatalogOpen] = useState(false);

  const { data: catalogItems = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["catalog-items", currentCompanyId],
    queryFn: () => db.ItemsCatalog.filter({ company_id: currentCompanyId }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["overhead-templates", currentCompanyId],
    queryFn: () => db.OverheadTemplate.filter({ company_id: currentCompanyId }),
  });

  const { data: templateLines = [] } = useQuery({
    queryKey: ["overhead-template-lines"],
    queryFn: () => db.OverheadTemplateLine.list(),
  });

  const addFromCatalog = (item: ItemsCatalog) => {
    const row: LineItemRow = {
      id: nextRowId(),
      item_name: item.name,
      category: item.category || "",
      unit: item.unit,
      qty: 1,
      unit_cost: item.default_unit_cost || 0,
      sell_price: item.default_sell_price || 0,
    };
    onLineItemsChange([...lineItems, row]);
    setCatalogOpen(false);
  };

  const addCustomItem = () => {
    onLineItemsChange([
      ...lineItems,
      {
        id: nextRowId(),
        item_name: "",
        category: "",
        unit: "ea",
        qty: 1,
        unit_cost: 0,
        sell_price: 0,
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof LineItemRow, value: string | number) => {
    onLineItemsChange(
      lineItems.map((li) => (li.id === id ? { ...li, [field]: value } : li))
    );
  };

  const removeLineItem = (id: string) => {
    onLineItemsChange(lineItems.filter((li) => li.id !== id));
  };

  const loadTemplate = (templateId: string) => {
    const lines = templateLines.filter(
      (tl: OverheadTemplateLine) => tl.overhead_template_id === templateId
    );
    const rows: OverheadRow[] = lines.map((tl) => ({
      id: nextRowId(),
      name: tl.name,
      type: tl.type,
      value: tl.value,
      enabled: tl.enabled,
    }));
    onOverheadChange(rows);
  };

  const addOverheadLine = () => {
    onOverheadChange([
      ...overheadItems,
      { id: nextRowId(), name: "", type: "percent", value: 0, enabled: true },
    ]);
  };

  const updateOverhead = (id: string, field: keyof OverheadRow, value: string | number | boolean) => {
    onOverheadChange(
      overheadItems.map((oh) => (oh.id === id ? { ...oh, [field]: value } : oh))
    );
  };

  const removeOverhead = (id: string) => {
    onOverheadChange(overheadItems.filter((oh) => oh.id !== id));
  };

  // Group catalog items by category
  const catalogByCategory = catalogItems.reduce<Record<string, ItemsCatalog[]>>((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const lineItemTotal = lineItems.reduce((sum, li) => sum + li.qty * li.unit_cost, 0);

  return (
    <div className="space-y-6">
      {/* Line Items */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            Line Items
            <Badge variant="secondary">{lineItems.length}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            <Popover open={catalogOpen} onOpenChange={setCatalogOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Package className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Add from Catalog</span>
                  <span className="sm:hidden">Catalog</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[320px]" align="end">
                <Command>
                  <CommandInput placeholder="Search catalog..." />
                  <CommandList>
                    {catalogLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                      </div>
                    ) : (
                      <>
                        <CommandEmpty>No items found.</CommandEmpty>
                        {Object.entries(catalogByCategory).map(([category, items]) => (
                          <CommandGroup key={category} heading={category}>
                            {items.map((item) => (
                              <CommandItem
                                key={item.id}
                                onSelect={() => addFromCatalog(item)}
                                className="cursor-pointer"
                              >
                                <span className="flex-1 truncate">{item.name}</span>
                                <span className="text-xs font-medium text-green-600 ml-2">
                                  ${item.default_unit_cost ?? 0}/{item.unit}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ))}
                      </>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={addCustomItem}>
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Custom Item</span>
              <span className="sm:hidden">Custom</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {lineItems.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No line items yet</h3>
              <p className="text-muted-foreground mb-6">
                Add items from your catalog or create custom entries.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCatalogOpen(true)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Browse Catalog
                </Button>
                <Button
                  onClick={addCustomItem}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Item
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium">Item</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium w-16">Unit</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium w-20">Qty</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium w-24">Cost</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium w-24 hidden sm:table-cell">Sell</TableHead>
                  <TableHead className="text-xs uppercase text-muted-foreground font-medium w-24 text-right">Total</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((li) => (
                  <TableRow key={li.id} className="group">
                    <TableCell>
                      <Input
                        value={li.item_name}
                        onChange={(e) => updateLineItem(li.id, "item_name", e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Item name"
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Input
                        value={li.category}
                        onChange={(e) => updateLineItem(li.id, "category", e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Category"
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{li.unit}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={li.qty}
                        onChange={(e) => updateLineItem(li.id, "qty", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.unit_cost}
                        onChange={(e) => updateLineItem(li.id, "unit_cost", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm w-24"
                      />
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.sell_price}
                        onChange={(e) => updateLineItem(li.id, "sell_price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600 whitespace-nowrap">
                      ${(li.qty * li.unit_cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => removeLineItem(li.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {lineItems.length > 0 && (
            <div className="flex justify-end items-center gap-2 px-4 py-3 border-t bg-muted/30">
              <span className="text-sm text-muted-foreground">Direct Cost Subtotal:</span>
              <span className="text-lg font-bold text-green-600">
                ${lineItemTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overhead */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-card-header-from to-card-header-to flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            Overhead
            <Badge variant="secondary">{overheadItems.filter((o) => o.enabled).length}</Badge>
          </CardTitle>
          <div className="flex gap-2">
            {templates.length > 0 && (
              <Select onValueChange={loadTemplate}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue placeholder="Load Template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={addOverheadLine}>
              <Plus className="w-4 h-4 mr-1" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {overheadItems.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No overhead lines</h3>
              <p className="text-muted-foreground mb-6">
                Load a template or add overhead lines manually.
              </p>
              <Button
                onClick={addOverheadLine}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Overhead Line
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {overheadItems.map((oh) => (
                <div
                  key={oh.id}
                  className={`flex items-center gap-2 group rounded-lg px-3 py-2 transition-colors hover:bg-accent ${
                    !oh.enabled ? "opacity-50" : ""
                  }`}
                >
                  <Switch
                    checked={oh.enabled}
                    onCheckedChange={(v) => updateOverhead(oh.id, "enabled", v)}
                    size="sm"
                  />
                  <Input
                    value={oh.name}
                    onChange={(e) => updateOverhead(oh.id, "name", e.target.value)}
                    className="h-8 text-sm flex-1"
                    placeholder="Overhead name"
                  />
                  <Select
                    value={oh.type}
                    onValueChange={(v) => updateOverhead(oh.id, "type", v)}
                  >
                    <SelectTrigger className="w-[70px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="dollar">$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={oh.value}
                    onChange={(e) => updateOverhead(oh.id, "value", parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm w-20"
                  />
                  <button
                    type="button"
                    onClick={() => removeOverhead(oh.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
