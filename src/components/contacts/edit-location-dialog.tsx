"use client";

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Location } from "@/data/types";

interface EditLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
}

export default function EditLocationDialog({ open, onOpenChange, location }: EditLocationDialogProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || "",
        address_line1: location.address_line1 || "",
        address_line2: location.address_line2 || "",
        city: location.city || "",
        state: location.state || "",
        zip: location.zip || "",
        notes: location.notes || "",
      });
    }
  }, [location]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Location>) => db.Location.update(location!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update location.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ ...formData });
  };

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="eloc_name">Location Name *</Label>
            <Input id="eloc_name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eloc_addr1">Street Address *</Label>
            <Input id="eloc_addr1" value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eloc_addr2">Suite / Unit</Label>
            <Input id="eloc_addr2" value={formData.address_line2} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eloc_city">City *</Label>
              <Input id="eloc_city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eloc_state">State *</Label>
              <Input id="eloc_state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} maxLength={2} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eloc_zip">ZIP *</Label>
              <Input id="eloc_zip" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} maxLength={5} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eloc_notes">Notes</Label>
            <Textarea id="eloc_notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
              {updateMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
