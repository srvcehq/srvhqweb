"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { AlertTriangle, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/providers/company-provider";
import { routes } from "@/lib/routes";
import type { Contact } from "@/data/types";

interface DeleteContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  navigateAfterDelete?: boolean;
}

export default function DeleteContactDialog({
  open,
  onOpenChange,
  contact,
  navigateAfterDelete = false,
}: DeleteContactDialogProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { currentCompanyId } = useCompany();

  const { data: maintenancePlans = [] } = useQuery({
    queryKey: ["contact-plans-for-delete", contact?.id, currentCompanyId],
    queryFn: async () => {
      if (!contact?.id || !currentCompanyId) return [];
      return await db.MaintenancePlan.filter({
        company_id: currentCompanyId,
        contact_id: contact.id,
      } as Record<string, unknown>);
    },
    enabled: !!contact?.id && !!currentCompanyId && open,
  });

  const { data: maintenanceVisits = [] } = useQuery({
    queryKey: ["contact-visits-for-delete", contact?.id, currentCompanyId],
    queryFn: async () => {
      if (!contact?.id || !currentCompanyId) return [];
      return await db.MaintenanceVisit.filter({
        company_id: currentCompanyId,
        contact_id: contact.id,
      } as Record<string, unknown>);
    },
    enabled: !!contact?.id && !!currentCompanyId && open,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!contact) return;
      const today = new Date().toISOString().split("T")[0];

      // Delete maintenance plans and future visits
      for (const plan of maintenancePlans) {
        const futureVisits = maintenanceVisits.filter(
          (v) =>
            v.maintenance_plan_id === plan.id &&
            v.visit_date !== undefined &&
            v.visit_date >= today
        );

        for (const visit of futureVisits) {
          await db.MaintenanceVisit.delete(visit.id);
        }

        await db.MaintenancePlan.delete(plan.id);
      }

      // Unlink bids
      const allBids = await db.Bid.list();
      const contactBids = allBids.filter((b) => b.contact_id === contact.id);
      for (const bid of contactBids) {
        await db.Bid.update(bid.id, { contact_id: "" });
      }

      // Delete the contact
      await db.Contact.delete(contact.id);
    },
    onSuccess: () => {
      router.push(routes.contacts);

      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact", contact?.id] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-visits"] });
      queryClient.invalidateQueries({ queryKey: ["bids"] });

      const deleteMessage =
        maintenancePlans.length > 0
          ? `Contact and ${maintenancePlans.length} maintenance plan(s) with future visits deleted.`
          : "Bids preserved and can be relinked from the Bids tab.";

      toast.success(deleteMessage);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to delete contact. Please try again.");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!contact) return null;

  const fullName = `${contact.first_name} ${contact.last_name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Delete Contact
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Are you sure you want to delete <strong>{fullName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800">
          <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-2">Bids will be preserved</p>
            <p className="text-sm">
              All bids associated with this contact will be unlinked but kept in your system. You
              can relink them to another contact from the Bids tab later.
            </p>
          </AlertDescription>
        </Alert>

        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-300">
            <p className="font-semibold mb-2">Consider archiving instead</p>
            <p className="text-sm mb-2">
              Deleting permanently may cause historical schedule items to lose contact details.{" "}
              <strong>Archive is recommended</strong> to preserve history while hiding the contact
              from active lists.
            </p>
          </AlertDescription>
        </Alert>

        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-300">
            <p className="font-semibold mb-2">The following will be permanently removed:</p>
            <ul className="text-sm list-disc list-inside space-y-1">
              <li>Contact information and notes</li>
              <li>Contact portal access</li>
              {maintenancePlans.length > 0 && (
                <li className="font-semibold text-red-900">
                  {maintenancePlans.length} maintenance plan(s) and all future scheduled visits
                </li>
              )}
            </ul>
            <p className="text-sm mt-2 italic">
              Past invoices and payment records will be preserved.
            </p>
          </AlertDescription>
        </Alert>

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
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Contact"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
