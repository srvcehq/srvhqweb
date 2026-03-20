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
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";
import type { Location } from "@/data/types";

interface CreateLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
}

export default function CreateLocationDialog({ open, onOpenChange, contactId }: CreateLocationDialogProps) {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompany();

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
    if (open) {
      setFormData({ name: "", address_line1: "", address_line2: "", city: "", state: "", zip: "", notes: "" });
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Location>) => db.Location.create({ ...data, contact_id: contactId, company_id: currentCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location added successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to add location.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...formData });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add Location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Location Name */}
          <div className="space-y-2">
            <Label htmlFor="loc_name">Location Name *</Label>
            <Input id="loc_name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Downtown Office Complex" required />
          </div>
          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="loc_addr1">Street Address *</Label>
            <Input id="loc_addr1" value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_addr2">Suite / Unit</Label>
            <Input id="loc_addr2" value={formData.address_line2} onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="loc_city">City *</Label>
              <Input id="loc_city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc_state">State *</Label>
              <Input id="loc_state" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} maxLength={2} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc_zip">ZIP *</Label>
              <Input id="loc_zip" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} maxLength={5} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc_notes">Notes</Label>
            <Textarea id="loc_notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Gate codes, access instructions, etc." />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700">
              {createMutation.isPending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>) : "Add Location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
