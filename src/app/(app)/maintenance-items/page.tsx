"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Category badge colors                                               */
/* ------------------------------------------------------------------ */

const CATEGORY_COLORS: Record<string, string> = {
  "Lawn Care": "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
  Pruning: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/40",
  Seasonal: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/40",
  "Beds & Gardens": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/40",
};

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function MaintenanceItemsPage() {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id?: string;
    name: string;
    description: string;
    default_price: string;
    category: string;
    unit: string;
  } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Data fetching
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["maintenance-items", currentCompanyId],
    queryFn: () =>
      db.MaintenanceItem.filter({ company_id: currentCompanyId }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      default_price?: number;
      category?: string;
      unit?: string;
    }) =>
      db.MaintenanceItem.create({
        ...data,
        company_id: currentCompanyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-items"] });
      setShowDialog(false);
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        description?: string;
        default_price?: number;
        category?: string;
        unit?: string;
      };
    }) => db.MaintenanceItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-items"] });
      setShowDialog(false);
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.MaintenanceItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-items"] });
      setShowDeleteDialog(false);
      setDeletingItem(null);
    },
  });

  // Filter
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Group by category
  const categories = useMemo(() => {
    const cats = new Map<string, typeof items>();
    for (const item of filteredItems) {
      const cat = item.category || "Uncategorized";
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat)!.push(item);
    }
    return cats;
  }, [filteredItems]);

  // Handlers
  const handleCreate = () => {
    setEditingItem({
      name: "",
      description: "",
      default_price: "",
      category: "",
      unit: "per visit",
    });
    setShowDialog(true);
  };

  const handleEdit = (item: (typeof items)[0]) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      description: item.description || "",
      default_price: item.default_price?.toString() || "",
      category: item.category || "",
      unit: item.unit || "per visit",
    });
    setShowDialog(true);
  };

  const handleDelete = (item: (typeof items)[0]) => {
    setDeletingItem({ id: item.id, name: item.name });
    setShowDeleteDialog(true);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.name.trim()) return;

    const data = {
      name: editingItem.name.trim(),
      description: editingItem.description.trim() || undefined,
      default_price: editingItem.default_price
        ? parseFloat(editingItem.default_price)
        : undefined,
      category: editingItem.category.trim() || undefined,
      unit: editingItem.unit.trim() || undefined,
    };

    if (editingItem.id) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
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

        {/* Main Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
            <div className="flex items-center justify-between gap-4">
              <CardTitle>
                Service Items ({items.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                <p className="text-muted-foreground mb-4">No maintenance items yet</p>
                <Button
                  onClick={handleCreate}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Item
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                      Default Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">
                      Unit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((item) => {
                      const catColor =
                        CATEGORY_COLORS[item.category || ""] ||
                        "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/40";
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-accent transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">
                              {item.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                              {item.description || "\u2014"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {item.category ? (
                              <Badge variant="outline" className={catColor}>
                                {item.category}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                \u2014
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {item.default_price ? (
                              <span className="font-medium text-foreground">
                                ${item.default_price.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                \u2014
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 hidden sm:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {item.unit || "per visit"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEdit(item)}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleDelete(item)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem?.id ? "Edit Item" : "New Maintenance Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem?.id
                  ? "Update the maintenance service item details."
                  : "Create a reusable service item for maintenance plans."}
              </DialogDescription>
            </DialogHeader>
            {editingItem && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Name *</Label>
                  <Input
                    id="item-name"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    placeholder="e.g. Lawn Mowing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-desc">Description</Label>
                  <Input
                    id="item-desc"
                    value={editingItem.description}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        description: e.target.value,
                      })
                    }
                    placeholder="Brief description of the service"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-price">Default Price ($)</Label>
                    <Input
                      id="item-price"
                      type="number"
                      value={editingItem.default_price}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          default_price: e.target.value,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-unit">Unit</Label>
                    <Input
                      id="item-unit"
                      value={editingItem.unit}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, unit: e.target.value })
                      }
                      placeholder="per visit"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-cat">Category</Label>
                  <Input
                    id="item-cat"
                    value={editingItem.category}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        category: e.target.value,
                      })
                    }
                    placeholder="e.g. Lawn Care, Seasonal"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!editingItem?.name.trim()}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {editingItem?.id ? "Save Changes" : "Create Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Maintenance Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete &quot;{deletingItem?.name}&quot;?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingItem && deleteMutation.mutate(deletingItem.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
