"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { MaintenancePlan, MaintenanceService } from "@/data/types";

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

interface EditMaintenancePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MaintenancePlan;
  onPlanUpdated?: () => void;
}

export default function EditMaintenancePlanDialog({
  open,
  onOpenChange,
  plan,
  onPlanUpdated,
}: EditMaintenancePlanDialogProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<MaintenancePlan["status"]>("active");
  const [frequency, setFrequency] = useState<MaintenancePlan["frequency"]>("weekly");
  const [pricePerVisit, setPricePerVisit] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [services, setServices] = useState<MaintenanceService[]>([]);

  // Sync form with plan when dialog opens
  useEffect(() => {
    if (open && plan) {
      setTitle(plan.title || "");
      setStatus(plan.status);
      setFrequency(plan.frequency);
      setPricePerVisit(plan.price_per_visit?.toString() || "");
      setMonthlyPrice(plan.monthly_price?.toString() || "");
      setDayOfWeek(plan.day_of_week?.toString() || "");
      setNotes(plan.notes || "");
      setServices(plan.services ? [...plan.services] : []);
    }
  }, [open, plan]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<MaintenancePlan>) =>
      db.MaintenancePlan.update(plan.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["maintenance-plans-all"],
      });
      toast.success("Plan updated.");
      onPlanUpdated?.();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update plan.");
    },
  });

  const handleSave = () => {
    if (!title.trim()) return;

    updateMutation.mutate({
      title: title.trim(),
      status,
      frequency,
      price_per_visit: parseFloat(pricePerVisit) || undefined,
      monthly_price: parseFloat(monthlyPrice) || undefined,
      day_of_week: dayOfWeek ? parseInt(dayOfWeek) : undefined,
      notes: notes.trim() || undefined,
      services,
    });
  };

  const toggleService = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId ? { ...s, included: !s.included } : s
      )
    );
  };

  const updateServicePrice = (serviceId: string, price: number) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, price } : s))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Edit Maintenance Plan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ep-title">Plan Name *</Label>
            <Input
              id="ep-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Lawn Care"
            />
          </div>

          {/* Status + Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(val) =>
                  setStatus(val as MaintenancePlan["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(val) =>
                  setFrequency(val as MaintenancePlan["frequency"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ep-ppv">Price Per Visit</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="ep-ppv"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerVisit}
                  onChange={(e) => setPricePerVisit(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-mp">Monthly Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="ep-mp"
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Day of Week */}
          <div className="space-y-2">
            <Label>Preferred Day</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Any day" />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Services */}
          {services.length > 0 && (
            <div className="space-y-2">
              <Label>Services</Label>
              <div className="rounded-lg border border-border divide-y divide-border">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-3 p-3"
                  >
                    <Switch
                      checked={service.included}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        service.included
                          ? "text-foreground"
                          : "text-muted-foreground line-through"
                      }`}
                    >
                      {service.name}
                    </span>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                        $
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.price}
                        onChange={(e) =>
                          updateServicePrice(
                            service.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="pl-5 h-8 text-sm"
                        disabled={!service.included}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm pt-1">
                <span className="text-muted-foreground">
                  {services.filter((s) => s.included).length} included
                </span>
                <span className="font-medium">
                  Total: $
                  {services
                    .filter((s) => s.included)
                    .reduce((sum, s) => sum + s.price, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="ep-notes">Notes</Label>
            <Textarea
              id="ep-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || updateMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
