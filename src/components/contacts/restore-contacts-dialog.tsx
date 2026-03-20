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
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/data/types";

interface RestoreContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Contact[];
  onComplete: () => void;
}

export default function RestoreContactsDialog({
  open,
  onOpenChange,
  selectedContacts,
  onComplete,
}: RestoreContactsDialogProps) {
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: async () => {
      for (const contact of selectedContacts) {
        await db.Contact.update(contact.id, {
          isArchived: false,
          archived_at: null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`${selectedContacts.length} contact(s) restored.`);
      onOpenChange(false);
      onComplete();
    },
    onError: () => {
      toast.error("Failed to restore contacts. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-green-600" />
            Restore Contacts
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Restore <strong>{selectedContacts.length} contact(s)</strong> from the archive?
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Restored contacts will reappear in your active contact lists based on their current
          projects and maintenance plans.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={restoreMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => restoreMutation.mutate()}
            disabled={restoreMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {restoreMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore {selectedContacts.length} Contact(s)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
