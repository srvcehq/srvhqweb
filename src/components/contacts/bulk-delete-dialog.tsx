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
import { Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Contact } from "@/data/types";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Contact[];
  onComplete: () => void;
}

export default function BulkDeleteDialog({
  open,
  onOpenChange,
  selectedContacts,
  onComplete,
}: BulkDeleteDialogProps) {
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      for (const contact of selectedContacts) {
        await db.Contact.update(contact.id, {
          isArchived: true,
          archived_at: now,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`${selectedContacts.length} contact(s) archived.`);
      onOpenChange(false);
      onComplete();
    },
    onError: () => {
      toast.error("Failed to archive contacts. Please try again.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Archive className="w-5 h-5 text-muted-foreground" />
            Archive Contacts
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Are you sure you want to archive{" "}
            <strong>{selectedContacts.length} contact(s)</strong>?
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Archived contacts will be hidden from active lists but their history will be preserved.
          You can restore them at any time.
        </p>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {archiveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Archiving...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Archive {selectedContacts.length} Contact(s)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
