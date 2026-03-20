"use client";

import React, { useState, useMemo } from "react";
import { db } from "@/data/api";
import { ItemsCatalog } from "@/data/types";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Package,
  MoreVertical,
  Edit,
  Trash2,
  FolderPlus,
  GripVertical,
} from "lucide-react";

export default function BidItemsPage() {
  const { currentCompanyId } = useCompany();

  const [items, setItems] = useState<ItemsCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemsCatalog | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ItemsCatalog | null>(null);

  const [itemForm, setItemForm] = useState({
    name: "",
    category: "",
    unit: "ea" as ItemsCatalog["unit"],
    default_unit_cost: 0,
    default_sell_price: 0,
    vendor: "",
  });

  const [newCategoryName, setNewCategoryName] = useState("");

  // Load items on mount
  React.useEffect(() => {
    async function load() {
      const data = await db.ItemsCatalog.filter({ company_id: currentCompanyId });
      setItems(data);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  // Derive categories from items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedCategory) {
      result = result.filter((item) => item.category === selectedCategory);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.vendor?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [items, selectedCategory, searchQuery]);

  const handleAddItem = () => {
    setEditingItem(null);
    setItemForm({
      name: "",
      category: selectedCategory || categories[0] || "",
      unit: "ea",
      default_unit_cost: 0,
      default_sell_price: 0,
      vendor: "",
    });
    setShowItemDialog(true);
  };

  const handleEditItem = (item: ItemsCatalog) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      category: item.category || "",
      unit: item.unit,
      default_unit_cost: item.default_unit_cost || 0,
      default_sell_price: item.default_sell_price || 0,
      vendor: item.vendor || "",
    });
    setShowItemDialog(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...itemForm,
      company_id: currentCompanyId,
      default_unit_cost: parseFloat(String(itemForm.default_unit_cost)) || 0,
      default_sell_price: parseFloat(String(itemForm.default_sell_price)) || 0,
    };

    if (editingItem) {
      const updated = await db.ItemsCatalog.update(editingItem.id, data);
      if (updated) {
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
      }
    } else {
      const created = await db.ItemsCatalog.create(data);
      setItems((prev) => [...prev, created]);
    }
    setShowItemDialog(false);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteItem) return;
    await db.ItemsCatalog.delete(pendingDeleteItem.id);
    setItems((prev) => prev.filter((i) => i.id !== pendingDeleteItem!.id));
    setPendingDeleteItem(null);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    // Categories are derived from items. Just close the dialog.
    // Set the category as selected so the user can add items to it.
    setSelectedCategory(newCategoryName.trim());
    setShowCategoryDialog(false);
    setNewCategoryName("");
  };

  const unitLabels: Record<string, string> = {
    ea: "Each",
    sq_ft: "Sq Ft",
    ton: "Ton",
    hr: "Hour",
    other: "Other",
  };

  const margin = (cost: number, sell: number) => {
    if (!sell) return 0;
    return (((sell - cost) / sell) * 100).toFixed(0);
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
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Bid Items</h1>
            <p className="text-muted-foreground mt-2">Manage your catalog of materials and services for bids</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCategoryDialog(true)}
              className="border-green-300 text-green-700 hover:bg-accent"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
            <Button
              onClick={handleAddItem}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Categories sidebar */}
          <div className="md:col-span-1">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !selectedCategory
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  All Items
                  <span className="float-right text-xs opacity-70">
                    {items.length}
                  </span>
                </button>
                {categories.map((cat) => {
                  const count = items.filter((i) => i.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === cat
                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                          : "hover:bg-accent text-foreground"
                      }`}
                    >
                      {cat}
                      <span className="float-right text-xs opacity-70">{count}</span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Items table */}
          <div className="md:col-span-3">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-green-600" />
                  {selectedCategory || "All Items"}
                  <Badge variant="outline" className="ml-2">
                    {filteredItems.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredItems.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      No Items Found
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery
                        ? "No items match your search"
                        : "Add your first bid item to get started"}
                    </p>
                    <Button
                      onClick={handleAddItem}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted">
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Sell Price</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map((item) => (
                          <TableRow key={item.id} className="hover:bg-accent/30">
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40"
                              >
                                {item.category || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {unitLabels[item.unit] || item.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${(item.default_unit_cost ?? 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-green-600">
                              ${(item.default_sell_price ?? 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className={
                                  Number(
                                    margin(
                                      item.default_unit_cost ?? 0,
                                      item.default_sell_price ?? 0
                                    )
                                  ) > 30
                                    ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40"
                                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40"
                                }
                              >
                                {margin(
                                  item.default_unit_cost ?? 0,
                                  item.default_sell_price ?? 0
                                )}
                                %
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {item.vendor || "—"}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditItem(item)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setPendingDeleteItem(item)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        </div>
      </div>

      {/* Item Editor Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {editingItem ? "Edit Item" : "Add Item"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name *</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g., Concrete Pavers (Standard)"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-category">Category</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(val) => setItemForm({ ...itemForm, category: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-unit">Unit *</Label>
                <Select
                  value={itemForm.unit}
                  onValueChange={(val) =>
                    setItemForm({ ...itemForm, unit: val as ItemsCatalog["unit"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ea">Each</SelectItem>
                    <SelectItem value="sq_ft">Sq Ft</SelectItem>
                    <SelectItem value="ton">Ton</SelectItem>
                    <SelectItem value="hr">Hour</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-cost">Unit Cost *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="item-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.default_unit_cost}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        default_unit_cost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="pl-7"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-sell">Sell Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="item-sell"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.default_sell_price}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        default_sell_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="pl-7"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-vendor">Vendor</Label>
              <Input
                id="item-vendor"
                value={itemForm.vendor}
                onChange={(e) => setItemForm({ ...itemForm, vendor: e.target.value })}
                placeholder="e.g., Denver Landscape Supply"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowItemDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                {editingItem ? "Update Item" : "Add Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input
                id="cat-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Drainage"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCategory}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                Add Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!pendingDeleteItem}
        onOpenChange={(open) => !open && setPendingDeleteItem(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{pendingDeleteItem?.name}&quot;? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteItem(null)}>
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
