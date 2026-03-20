"use client";

import React, { useState } from "react";
import { db } from "@/data/api";
import { HardCost } from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const CATEGORIES = ["Materials", "Equipment", "Labor", "Subcontractor", "Misc"];

export default function HardCostsPage() {
  const { currentCompanyId } = useCompany();

  const [hardCosts, setHardCosts] = useState<HardCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCost, setEditingCost] = useState<HardCost | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HardCost | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "Materials",
    cost: 0,
    unit: "",
    vendor: "",
    notes: "",
  });

  // Load data on mount
  React.useEffect(() => {
    async function load() {
      const data = await db.HardCost.filter({ company_id: currentCompanyId });
      setHardCosts(data);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  const totalCost = hardCosts.reduce((sum, c) => sum + (c.cost || 0), 0);

  const handleAdd = () => {
    setEditingCost(null);
    setFormData({
      name: "",
      category: "Materials",
      cost: 0,
      unit: "",
      vendor: "",
      notes: "",
    });
    setShowDialog(true);
  };

  const handleEdit = (cost: HardCost) => {
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      category: cost.category || "Misc",
      cost: cost.cost,
      unit: cost.unit || "",
      vendor: cost.vendor || "",
      notes: cost.notes || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      cost: parseFloat(String(formData.cost)) || 0,
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
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Hard Costs</h1>
            <p className="text-muted-foreground mt-2">
              Manage material, equipment, and overhead cost items
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

        {/* Summary Card */}
        <Card className="bg-gradient-to-r from-card-header-from to-card-header-to border-green-200 dark:border-green-800/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hard Costs Catalog</p>
                <p className="text-3xl font-bold text-green-600">
                  {hardCosts.length} items
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Combined value: ${totalCost.toFixed(2)}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b">
            <CardTitle>Hard Cost Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {hardCosts.length === 0 ? (
              <div className="p-12 text-center">
                <DollarSign className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Hard Costs Yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Add your first cost item to get started
                </p>
                <Button onClick={handleAdd} className="bg-green-600 hover:bg-green-700">
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
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hardCosts.map((cost) => (
                      <TableRow key={cost.id} className="hover:bg-accent/30">
                        <TableCell className="font-medium">{cost.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              cost.category === "Equipment"
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40"
                                : cost.category === "Materials"
                                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40"
                                  : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700"
                            }
                          >
                            {cost.category || "Misc"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 font-mono">
                          ${cost.cost?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cost.unit || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {cost.vendor || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {cost.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(cost)}
                              className="hover:bg-blue-50 h-8 w-8"
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPendingDelete(cost)}
                              className="hover:bg-red-50 h-8 w-8"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingCost ? "Edit Hard Cost" : "Add Hard Cost"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="hc-name">Cost Name *</Label>
              <Input
                id="hc-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Concrete Mix (80lb bag)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hc-cost">Cost *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="hc-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="pl-7"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hc-unit">Unit</Label>
                <Input
                  id="hc-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., bag, ton, day, ea"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hc-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hc-vendor">Vendor</Label>
                <Input
                  id="hc-vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g., Home Depot"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hc-notes">Notes</Label>
              <Textarea
                id="hc-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Optional notes about this cost..."
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
                {editingCost ? "Update Cost" : "Add Cost"}
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
              Are you sure you want to delete &quot;{pendingDelete?.name}&quot;? This cannot
              be undone.
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
