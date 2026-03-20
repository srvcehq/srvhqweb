"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/data/types";

interface PermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Contact[];
  onComplete: () => void;
}

export default function PermanentDeleteDialog({
  open,
  onOpenChange,
  selectedContacts,
  onComplete,
}: PermanentDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      for (const contact of selectedContacts) {
        // Unlink bids
        const allBids = await db.Bid.list();
        const contactBids = allBids.filter((b) => b.contact_id === contact.id);
        for (const bid of contactBids) {
          await db.Bid.update(bid.id, { contact_id: "" });
        }

        // Delete maintenance plans and visits
        const plans = await db.MaintenancePlan.filter({
          contact_id: contact.id,
        } as Record<string, unknown>);
        for (const plan of plans) {
          const visits = await db.MaintenanceVisit.filter({
            maintenance_plan_id: plan.id,
          } as Record<string, unknown>);
          for (const visit of visits) {
            await db.MaintenanceVisit.delete(visit.id);
          }
          await db.MaintenancePlan.delete(plan.id);
        }

        // Delete the contact
        await db.Contact.delete(contact.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-visits"] });
      queryClient.invalidateQueries({ queryKey: ["bids"] });
      toast.success(`${selectedContacts.length} contact(s) permanently deleted.`);
      onOpenChange(false);
      onComplete();
    },
    onError: () => {
      toast.error("Failed to delete contacts. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Permanently Delete Contacts
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Permanently delete <strong>{selectedContacts.length} contact(s)</strong>? This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <p className="font-semibold mb-2">This action is irreversible</p>
            <p className="text-sm">
              All contact data, maintenance plans, and scheduled visits will be permanently
              removed. Bids will be unlinked but preserved.
            </p>
          </AlertDescription>
        </Alert>

        <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-3">
          <p className="text-sm font-medium text-foreground mb-2">Contacts to delete:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            {selectedContacts.map((contact) => (
              <li key={contact.id}>
                {contact.first_name} {contact.last_name}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Permanently Delete
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
