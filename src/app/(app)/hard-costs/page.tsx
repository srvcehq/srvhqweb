"use client";

import React, { useState, useMemo } from "react";
import { db } from "@/data/api";
import { HardCost } from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { formatCurrency } from "@/lib/format-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, DollarSign, Pencil } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const CATEGORIES: { value: HardCost["category"]; label: string }[] = [
  { value: "equipment", label: "Equipment" },
  { value: "insurance", label: "Insurance" },
  { value: "rent", label: "Rent" },
  { value: "software", label: "Software" },
  { value: "fuel", label: "Fuel" },
  { value: "vehicle", label: "Vehicle" },
  { value: "other", label: "Other" },
];

const COST_BASIS: { value: NonNullable<HardCost["cost_basis"]>; label: string }[] = [
  { value: "per_job", label: "Per Job" },
  { value: "per_visit", label: "Per Visit" },
  { value: "per_hour", label: "Per Hour" },
  { value: "flat", label: "Flat" },
];

function categoryBadgeClass(category?: string) {
  switch (category) {
    case "equipment":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40";
    case "insurance":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/40";
    case "rent":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40";
    case "software":
      return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-800/40";
    case "fuel":
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800/40";
    case "vehicle":
      return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700";
  }
}

function costBasisLabel(basis?: string) {
  return COST_BASIS.find((b) => b.value === basis)?.label || "Per Job";
}

function categoryLabel(cat?: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label || "Other";
}


/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HardCostsPage() {
  const { currentCompanyId } = useCompany();

  const [hardCosts, setHardCosts] = useState<HardCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<HardCost | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HardCost | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    monthly_cost: 0,
    category: "equipment" as HardCost["category"],
    cost_basis: "per_job" as HardCost["cost_basis"],
    notes: "",
    is_active: true,
  });

  // Load data
  React.useEffect(() => {
    async function load() {
      const data = await db.HardCost.filter({ company_id: currentCompanyId });
      setHardCosts(data);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  // Computed totals
  const totals = useMemo(() => {
    const activeMonthly = hardCosts
      .filter((c) => c.is_active)
      .reduce((sum, c) => sum + (c.monthly_cost || 0), 0);
    return {
      activeMonthly,
      activeDaily: activeMonthly / 30,
      activeCount: hardCosts.filter((c) => c.is_active).length,
      totalCount: hardCosts.length,
    };
  }, [hardCosts]);

  const handleAdd = () => {
    setEditingCost(null);
    setFormData({
      name: "",
      monthly_cost: 0,
      category: "equipment",
      cost_basis: "per_job",
      notes: "",
      is_active: true,
    });
    setShowDialog(true);
  };

  const handleEdit = (cost: HardCost) => {
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      monthly_cost: cost.monthly_cost,
      category: cost.category || "other",
      cost_basis: cost.cost_basis || "per_job",
      notes: cost.notes || "",
      is_active: cost.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      monthly_cost: parseFloat(String(formData.monthly_cost)) || 0,
      company_id: currentCompanyId,
    };

    if (editingCost) {
      const updated = await db.HardCost.update(editingCost.id, data);
      if (updated) {
        setHardCosts((prev) =>
          prev.map((c) => (c.id === editingCost.id ? updated : c))
        );
      }
    } else {
      const created = await db.HardCost.create(data);
      setHardCosts((prev) => [...prev, created]);
    }
    setShowDialog(false);
  };

  const handleToggleActive = async (cost: HardCost) => {
    const updated = await db.HardCost.update(cost.id, {
      is_active: !cost.is_active,
    });
    if (updated) {
      setHardCosts((prev) =>
        prev.map((c) => (c.id === cost.id ? updated : c))
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await db.HardCost.delete(pendingDelete.id);
    setHardCosts((prev) => prev.filter((c) => c.id !== pendingDelete!.id));
    setPendingDelete(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Hard Costs
            </h1>
            <p className="text-muted-foreground mt-2">
              Monthly overhead costs used in bid profit calculations
            </p>
          </div>
          <Button
            onClick={handleAdd}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hard Cost
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-r from-card-header-from to-card-header-to border-green-200 dark:border-green-800/40">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Total Active Monthly Costs
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {formatCurrency(totals.activeMonthly)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.activeCount} of {totals.totalCount} costs active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Daily Rate</p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {formatCurrency(totals.activeDaily)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly &divide; 30 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">
                Example: 5-Day Job
              </p>
              <p className="text-3xl font-bold text-foreground mt-1">
                {formatCurrency(totals.activeDaily * 5)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Added to internal cost on bids
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b">
            <CardTitle>Overhead Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {hardCosts.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Hard Costs Yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Add your monthly overhead costs to include them in bid
                  calculations
                </p>
                <Button
                  onClick={handleAdd}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Hard Cost
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead className="text-right">Daily</TableHead>
                      <TableHead>Basis</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hardCosts.map((cost) => {
                      const dailyCost = (cost.monthly_cost || 0) / 30;

                      return (
                        <TableRow
                          key={cost.id}
                          className={
                            cost.is_active
                              ? "hover:bg-accent/30"
                              : "opacity-50 hover:bg-accent/30"
                          }
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{cost.name}</p>
                              {cost.notes && (
                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                  {cost.notes}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={categoryBadgeClass(cost.category)}
                            >
                              {categoryLabel(cost.category)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-green-600 font-mono">
                            {formatCurrency(cost.monthly_cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(dailyCost)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {costBasisLabel(cost.cost_basis)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={cost.is_active}
                              onCheckedChange={() => handleToggleActive(cost)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(cost)}
                                className="hover:bg-blue-50 dark:hover:bg-blue-950/20 h-8 w-8"
                              >
                                <Pencil className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPendingDelete(cost)}
                                className="hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingCost ? "Edit Hard Cost" : "Add Hard Cost"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="hc-name">Name *</Label>
              <Input
                id="hc-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., General Liability Insurance"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hc-cost">Monthly Cost *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="hc-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monthly_cost || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthly_cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="pl-7"
                    required
                  />
                </div>
                {formData.monthly_cost > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Daily: {formatCurrency(formData.monthly_cost / 30)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category || "other"}
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      category: val as HardCost["category"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value!}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cost Basis</Label>
              <Select
                value={formData.cost_basis || "per_job"}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    cost_basis: val as HardCost["cost_basis"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_BASIS.map((basis) => (
                    <SelectItem key={basis.value} value={basis.value}>
                      {basis.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines how this cost is applied to bids
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hc-notes">Notes</Label>
              <Textarea
                id="hc-notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                placeholder="Optional notes..."
              />
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
                {editingCost ? "Update" : "Add Cost"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hard cost?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{pendingDelete?.name}&quot;?
              This will remove it from future bid calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
