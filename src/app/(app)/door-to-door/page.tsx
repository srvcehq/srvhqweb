"use client";

import React, { useState, useMemo } from "react";
import { db } from "@/data/api";
import { DoorToDoorPin, Contact } from "@/data/types";
import { useCompany } from "@/providers/company-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
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
  DoorOpen,
  Plus,
  MapPin,
  Trash2,
  Search,
  Map as MapIcon,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgClass: string }
> = {
  not_visited: {
    label: "Not Visited",
    color: "#6b7280",
    bgClass: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700",
  },
  visited: {
    label: "Visited",
    color: "#3b82f6",
    bgClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/40",
  },
  interested: {
    label: "Interested",
    color: "#22c55e",
    bgClass: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/40",
  },
  not_interested: {
    label: "Not Interested",
    color: "#ef4444",
    bgClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800/40",
  },
  not_home: {
    label: "Not Home",
    color: "#f59e0b",
    bgClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/40",
  },
};

export default function DoorToDoorPage() {
  const { currentCompanyId } = useCompany();

  const [pins, setPins] = useState<DoorToDoorPin[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DoorToDoorPin | null>(null);
  const [selectedPin, setSelectedPin] = useState<DoorToDoorPin | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    address: "",
    lat: 39.75,
    lng: -104.99,
    status: "not_visited" as DoorToDoorPin["status"],
    notes: "",
  });

  // Load data on mount
  React.useEffect(() => {
    async function load() {
      const [p, c] = await Promise.all([
        db.DoorToDoorPin.filter({ company_id: currentCompanyId }),
        db.Contact.filter({ company_id: currentCompanyId }),
      ]);
      setPins(p);
      setContacts(c);
      setLoading(false);
    }
    load();
  }, [currentCompanyId]);

  const getContactName = (contactId?: string) => {
    if (!contactId) return null;
    const c = contacts.find((ct) => ct.id === contactId);
    return c ? `${c.first_name} ${c.last_name}` : null;
  };

  // Filter pins
  const filteredPins = useMemo(() => {
    let result = [...pins].sort(
      (a, b) =>
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
    );

    if (filterStatus !== "all") {
      result = result.filter((p) => p.status === filterStatus);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.address.toLowerCase().includes(q) ||
          p.notes?.toLowerCase().includes(q) ||
          getContactName(p.contact_id)?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [pins, filterStatus, searchQuery, contacts]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: pins.length };
    pins.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [pins]);

  const handleAddPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await db.DoorToDoorPin.create({
      ...formData,
      company_id: currentCompanyId,
    });
    setPins((prev) => [created, ...prev]);
    setShowAddDialog(false);
    setFormData({
      address: "",
      lat: 39.75,
      lng: -104.99,
      status: "not_visited",
      notes: "",
    });
  };

  const handleStatusChange = async (
    pin: DoorToDoorPin,
    newStatus: DoorToDoorPin["status"]
  ) => {
    const updated = await db.DoorToDoorPin.update(pin.id, {
      status: newStatus,
      visited_at:
        newStatus !== "not_visited" ? new Date().toISOString() : pin.visited_at,
    });
    if (updated) {
      setPins((prev) => prev.map((p) => (p.id === pin.id ? updated : p)));
      if (selectedPin?.id === pin.id) {
        setSelectedPin(updated);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await db.DoorToDoorPin.delete(pendingDelete.id);
    setPins((prev) => prev.filter((p) => p.id !== pendingDelete!.id));
    if (selectedPin?.id === pendingDelete.id) setSelectedPin(null);
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
    <div className="min-h-screen bg-gradient-to-br from-card-header-from via-background to-card-header-to p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Door to Door
            </h1>
            <p className="text-muted-foreground mt-2">
              Track door-to-door canvassing, leads, and follow-ups
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Pin
          </Button>
        </div>

        {/* Map Placeholder */}
        <Card className="shadow-lg overflow-hidden border-2 border-border">
          <CardContent className="p-0">
            <div className="h-[300px] bg-gradient-to-br from-muted to-muted/80 flex flex-col items-center justify-center">
              <MapIcon className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium text-lg">
                Map view requires Google Maps API key
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Configure your API key in Settings to enable the interactive map
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            className={
              filterStatus === "all"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                : ""
            }
          >
            All ({statusCounts.all || 0})
          </Button>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={filterStatus === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(key)}
              className={filterStatus === key ? config.bgClass : ""}
            >
              <div
                className="w-3 h-3 rounded-full mr-1.5"
                style={{ backgroundColor: config.color }}
              />
              {config.label} ({statusCounts[key] || 0})
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pins List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPins.length === 0 ? (
            <div className="md:col-span-3">
              <Card className="shadow-lg">
                <CardContent className="p-12 text-center">
                  <DoorOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No Door-to-Door Pins
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {pins.length === 0
                      ? "Start tracking your door-to-door canvassing"
                      : "No pins match your current filters"}
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Pin
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredPins.map((pin) => {
              const config = STATUS_CONFIG[pin.status] || STATUS_CONFIG.not_visited;
              const contactName = getContactName(pin.contact_id);

              return (
                <Card
                  key={pin.id}
                  className={`shadow-md hover:shadow-lg transition-shadow cursor-pointer ${
                    selectedPin?.id === pin.id ? "ring-2 ring-green-500" : ""
                  }`}
                  onClick={() => setSelectedPin(pin)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: config.color }}
                        />
                        <Badge variant="outline" className={config.bgClass}>
                          {config.label}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(pin);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>

                    <p className="font-medium text-foreground mb-1">{pin.address}</p>

                    {contactName && (
                      <p className="text-sm text-green-600 font-medium mb-1">
                        {contactName}
                      </p>
                    )}

                    {pin.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {pin.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        {new Date(pin.created_date).toLocaleDateString()}
                      </p>
                      <Select
                        value={pin.status}
                        onValueChange={(val) =>
                          handleStatusChange(pin, val as DoorToDoorPin["status"])
                        }
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: cfg.color }}
                                />
                                {cfg.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add Pin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Add Door-to-Door Pin
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPin} className="space-y-4">
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="123 Main St, Denver, CO 80202"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    status: val as DoorToDoorPin["status"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cfg.color }}
                        />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                placeholder="Quick notes about this house or conversation..."
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                Save Pin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this pin?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this door-to-door pin at &quot;
              {pendingDelete?.address}&quot;? This will not delete any linked contact.
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
