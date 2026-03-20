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
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/data/types";

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
}

export default function EditContactDialog({
  open,
  onOpenChange,
  contact,
}: EditContactDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    company_name: "",
  });

  const isCommercial = contact?.contact_type === "commercial";

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        address_line1: contact.address_line1 || "",
        address_line2: contact.address_line2 || "",
        city: contact.city || "",
        state: contact.state || "",
        zip: contact.zip || "",
        notes: contact.notes || "",
        company_name: contact.company_name || "",
      });
    }
  }, [contact]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Contact>) => db.Contact.update(contact!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", contact!.id] });
      queryClient.invalidateQueries({ queryKey: ["contact-bids", contact!.id] });
      queryClient.invalidateQueries({ queryKey: ["contact-projects", contact!.id] });
      queryClient.invalidateQueries({ queryKey: ["contact-payments", contact!.id] });

      toast.success("Contact updated successfully.");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to update contact. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave: Partial<Contact> = { ...formData };
    // Only include company_name for commercial contacts
    if (!isCommercial) {
      delete dataToSave.company_name;
    }
    updateMutation.mutate(dataToSave);
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl font-bold">Edit Contact</DialogTitle>
            {isCommercial && (
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/30">
                <Building2 className="mr-1 h-3 w-3" />
                Commercial
              </Badge>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {isCommercial && (
            <div className="space-y-2">
              <Label htmlFor="edit_company_name">Company Name *</Label>
              <Input
                id="edit_company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="e.g. Metro Properties LLC"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">First Name *</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_email">Email</Label>
            <Input
              id="edit_email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_phone">Phone</Label>
            <Input
              id="edit_phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_address_line1">Street Address</Label>
            <Input
              id="edit_address_line1"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="123 Main St"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_address_line2">Apartment, Suite, etc.</Label>
            <Input
              id="edit_address_line2"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Apt 4B"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_city">City</Label>
              <Input
                id="edit_city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Austin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_state">State</Label>
              <Input
                id="edit_state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="TX"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_zip">ZIP</Label>
              <Input
                id="edit_zip"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                placeholder="78701"
                maxLength={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <Textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Internal notes about this client..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
