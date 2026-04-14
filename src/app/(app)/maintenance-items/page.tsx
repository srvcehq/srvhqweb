"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { MaintenanceItem } from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type PricingType = MaintenanceItem["pricing_type"];

const PRICING_TYPE_CONFIG: Record<
  PricingType,
  { label: string; badgeClass: string }
> = {
  per_unit: {
    label: "Per Unit",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40",
  },
  flat_rate: {
    label: "Flat Rate",
    badgeClass:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40",
  },
  variable: {
    label: "Variable",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40",
  },
};

function pricingDisplay(item: MaintenanceItem): string {
  switch (item.pricing_type) {
    case "per_unit":
      return item.price_per_unit
        ? `$${item.price_per_unit.toFixed(2)} / ${item.unit_label || "unit"}`
        : "\u2014";
    case "flat_rate":
      return item.price_per_visit
        ? `$${item.price_per_visit.toFixed(2)}`
        : "\u2014";
    case "variable": {
      if (item.suggested_min && item.suggested_max) {
        return `$${item.suggested_min}\u2013$${item.suggested_max}`;
      }
      return "Set per client";
    }
    default:
      return "\u2014";
  }
}

function durationDisplay(item: MaintenanceItem): string | null {
  if (
    item.pricing_type === "per_unit" &&
    item.avg_minutes_per_unit
  ) {
    return `${item.avg_minutes_per_unit} min/${item.unit_label || "unit"}`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Form state type                                                     */
/* ------------------------------------------------------------------ */

interface FormData {
  name: string;
  description: string;
  pricing_type: PricingType;
  unit_label: string;
  price_per_unit: string;
  avg_minutes_per_unit: string;
  price_per_visit: string;
  suggested_min: string;
  suggested_max: string;
}

const EMPTY_FORM: FormData = {
  name: "",
  description: "",
  pricing_type: "flat_rate",
  unit_label: "",
  price_per_unit: "",
  avg_minutes_per_unit: "",
  price_per_visit: "",
  suggested_min: "",
  suggested_max: "",
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MaintenanceItemsPage() {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Data
  const { data: items = [], isLoading } = useQuery({
    queryKey: queryKeys.maintenanceItems(currentCompanyId),
    queryFn: () =>
      db.MaintenanceItem.filter({ company_id: currentCompanyId }),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<MaintenanceItem>) => {
      if (editingId) {
        return db.MaintenanceItem.update(editingId, data);
      }
      return db.MaintenanceItem.create({
        ...data,
        company_id: currentCompanyId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItems(currentCompanyId) });
      setShowDialog(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      db.MaintenanceItem.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItems(currentCompanyId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.MaintenanceItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceItems(currentCompanyId) });
      setShowDeleteDialog(false);
      setDeletingItem(null);
    },
  });

  // Filter + sort: active first, then alphabetical
  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, searchQuery]);

  const activeCount = items.filter((i) => i.is_active).length;

  // Handlers
  const handleCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowDialog(true);
  };

  const handleEdit = (item: MaintenanceItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || "",
      pricing_type: item.pricing_type,
      unit_label: item.unit_label || "",
      price_per_unit: item.price_per_unit?.toString() || "",
      avg_minutes_per_unit: item.avg_minutes_per_unit?.toString() || "",
      price_per_visit: item.price_per_visit?.toString() || "",
      suggested_min: item.suggested_min?.toString() || "",
      suggested_max: item.suggested_max?.toString() || "",
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    const data: Partial<MaintenanceItem> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      pricing_type: formData.pricing_type,
      is_active: true,
      // Clear fields not relevant to selected pricing type
      unit_label: undefined,
      price_per_unit: undefined,
      avg_minutes_per_unit: undefined,
      price_per_visit: undefined,
      suggested_min: undefined,
      suggested_max: undefined,
    };

    switch (formData.pricing_type) {
      case "per_unit":
        data.unit_label = formData.unit_label.trim() || undefined;
        data.price_per_unit = parseFloat(formData.price_per_unit) || undefined;
        data.avg_minutes_per_unit =
          parseFloat(formData.avg_minutes_per_unit) || undefined;
        break;
      case "flat_rate":
        data.price_per_visit =
          parseFloat(formData.price_per_visit) || undefined;
        break;
      case "variable":
        data.suggested_min = parseFloat(formData.suggested_min) || undefined;
        data.suggested_max = parseFloat(formData.suggested_max) || undefined;
        break;
    }

    // Preserve is_active on edit
    if (editingId) {
      const existing = items.find((i) => i.id === editingId);
      if (existing) data.is_active = existing.is_active;
    }

    saveMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Maintenance Items
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Reusable service templates for maintenance plans
            </p>
          </div>
          <Button
            onClick={handleCreate}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        </div>

        {/* Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
            <div className="flex items-center justify-between gap-4">
              <CardTitle>
                Service Items ({activeCount} active, {items.length} total)
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {items.length === 0
                    ? "No maintenance items yet"
                    : "No items match your search"}
                </p>
                {items.length === 0 && (
                  <Button
                    onClick={handleCreate}
                    className="bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Pricing Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                        Active
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredItems.map((item) => {
                      const ptConfig = PRICING_TYPE_CONFIG[item.pricing_type];
                      const duration = durationDisplay(item);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-accent/30 transition-colors ${
                            !item.is_active ? "opacity-50" : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-foreground">
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className={ptConfig.badgeClass}
                            >
                              {ptConfig.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-medium text-foreground font-mono">
                              {pricingDisplay(item)}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {duration || "\u2014"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({
                                  id: item.id,
                                  is_active: checked,
                                })
                              }
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(item)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => {
                                  setDeletingItem({
                                    id: item.id,
                                    name: item.name,
                                  });
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ Create / Edit Dialog ============ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingId ? "Edit Item" : "New Maintenance Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="mi-name">Service Name *</Label>
              <Input
                id="mi-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Lawn Mowing"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="mi-desc">Description</Label>
              <Textarea
                id="mi-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of the service"
                rows={2}
              />
            </div>

            {/* Pricing Type */}
            <div className="space-y-2">
              <Label>Pricing Type *</Label>
              <Select
                value={formData.pricing_type}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    pricing_type: val as PricingType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_rate">
                    Flat Rate &mdash; fixed price per visit
                  </SelectItem>
                  <SelectItem value="per_unit">
                    Per Unit &mdash; price per sqft, window, etc.
                  </SelectItem>
                  <SelectItem value="variable">
                    Variable &mdash; set per client
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ---- Conditional fields ---- */}

            {formData.pricing_type === "flat_rate" && (
              <div className="space-y-2">
                <Label htmlFor="mi-ppv">Price Per Visit *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="mi-ppv"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price_per_visit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_per_visit: e.target.value,
                      })
                    }
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {formData.pricing_type === "per_unit" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mi-unit">Unit Label *</Label>
                    <Input
                      id="mi-unit"
                      value={formData.unit_label}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unit_label: e.target.value,
                        })
                      }
                      placeholder="e.g. sqft, window, yard"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mi-ppu">Price Per Unit *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="mi-ppu"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price_per_unit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price_per_unit: e.target.value,
                          })
                        }
                        className="pl-7"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mi-mins">
                    Avg. Minutes Per Unit
                  </Label>
                  <Input
                    id="mi-mins"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.avg_minutes_per_unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        avg_minutes_per_unit: e.target.value,
                      })
                    }
                    placeholder="e.g. 5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for scheduling — estimates visit duration based on
                    quantity
                  </p>
                </div>
              </>
            )}

            {formData.pricing_type === "variable" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mi-min">Suggested Min</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="mi-min"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.suggested_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          suggested_min: e.target.value,
                        })
                      }
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mi-max">Suggested Max</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="mi-max"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.suggested_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          suggested_max: e.target.value,
                        })
                      }
                      className="pl-7"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground -mt-2">
                  Price is set per client inside each maintenance plan
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name.trim() || saveMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============ Delete Confirmation ============ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingItem?.name}&quot;?
              This won&apos;t affect existing maintenance plans that already use
              this item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingItem && deleteMutation.mutate(deletingItem.id)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
