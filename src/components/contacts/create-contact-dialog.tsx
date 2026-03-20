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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Home, Building2, ArrowLeft, ArrowRight } from "lucide-react";
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";
import type { Contact } from "@/data/types";

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: Partial<Contact>;
  onContactCreated?: (contact: Contact) => void;
  onCreateMaintenancePlan?: (contact: Contact) => void;
  onCreateBid?: (contact: Contact) => void;
}

export default function CreateContactDialog({
  open,
  onOpenChange,
  prefillData = {},
  onContactCreated,
  onCreateMaintenancePlan,
  onCreateBid,
}: CreateContactDialogProps) {
  const queryClient = useQueryClient();
  const { currentCompanyId, isLoading: isLoadingCompany } = useCompany();
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingSubmitOptions, setPendingSubmitOptions] = useState<{
    createMaintenancePlan?: boolean;
    createBid?: boolean;
  } | null>(null);

  const [step, setStep] = useState<"type-selection" | "details">("type-selection");
  const [contactType, setContactType] = useState<"residential" | "commercial">("residential");

  const getInitialFormData = () => ({
    first_name: (prefillData.first_name as string) || "",
    last_name: (prefillData.last_name as string) || "",
    email: (prefillData.email as string) || "",
    phone: (prefillData.phone as string) || "",
    address_line1: (prefillData.address_line1 as string) || "",
    city: (prefillData.city as string) || "",
    state: (prefillData.state as string) || "",
    zip: (prefillData.zip as string) || "",
    notes: "",
    company_name: "",
    contact_type: "residential" as "residential" | "commercial",
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [pendingMaintenancePlan, setPendingMaintenancePlan] = useState(false);
  const [pendingBid, setPendingBid] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setStep("type-selection");
      setContactType("residential");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<Contact>) =>
      db.Contact.create({
        ...data,
        company_id: currentCompanyId,
        portal_token: Math.random().toString(36).substring(2, 15),
      }),
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      if (onContactCreated) {
        onContactCreated(newContact);
      }

      if (pendingMaintenancePlan && onCreateMaintenancePlan) {
        toast.success("Contact created. Opening maintenance plan setup...");
        onCreateMaintenancePlan(newContact);
      } else if (pendingBid && onCreateBid) {
        toast.success("Contact created. Opening bid creator...");
        onCreateBid(newContact);
      } else {
        toast.success("New client added successfully.");
      }

      setPendingMaintenancePlan(false);
      setPendingBid(false);
      onOpenChange(false);
      setFormData(getInitialFormData());
    },
    onError: () => {
      setPendingMaintenancePlan(false);
      setPendingBid(false);
      toast.error("Failed to create contact. Please try again.");
    },
  });

  const handleSubmit = (
    e: React.FormEvent,
    options: { createMaintenancePlan?: boolean; createBid?: boolean } = {}
  ) => {
    e.preventDefault();

    const emailEmpty = !formData.email || !formData.email.trim();

    if (emailEmpty) {
      setPendingSubmitOptions(options);
      setShowEmailConfirmation(true);
      return;
    }

    proceedWithCreate(options);
  };

  const proceedWithCreate = (
    options: { createMaintenancePlan?: boolean; createBid?: boolean } = {}
  ) => {
    const { createMaintenancePlan = false, createBid = false } = options;
    setPendingMaintenancePlan(createMaintenancePlan);
    setPendingBid(createBid);

    const dataToSave: Partial<Contact> = {
      ...formData,
      contact_type: contactType,
    };

    if (!dataToSave.email || !(dataToSave.email as string).trim()) {
      dataToSave.email = undefined;
    }

    // Only include company_name for commercial contacts
    if (contactType !== "commercial") {
      dataToSave.company_name = undefined;
    }

    createMutation.mutate(dataToSave);
  };

  const handleContinueToDetails = () => {
    setFormData((prev) => ({ ...prev, contact_type: contactType }));
    setStep("details");
  };

  if (isLoadingCompany) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {step === "type-selection"
              ? "Add New Contact"
              : contactType === "commercial"
                ? "Commercial Contact Details"
                : "Contact Details"}
          </DialogTitle>
        </DialogHeader>

        {step === "type-selection" ? (
          <div className="space-y-6 mt-4">
            <p className="text-sm text-muted-foreground">
              What type of contact would you like to create?
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Residential Card */}
              <button
                type="button"
                onClick={() => setContactType("residential")}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-200 cursor-pointer text-left ${
                  contactType === "residential"
                    ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md shadow-green-100 ring-1 ring-green-200"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                    contactType === "residential"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Home className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <p
                    className={`text-base font-semibold ${
                      contactType === "residential" ? "text-green-800 dark:text-green-300" : "text-foreground"
                    }`}
                  >
                    Residential
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Individual homeowner or tenant
                  </p>
                </div>
                {contactType === "residential" && (
                  <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-green-500 ring-2 ring-green-200" />
                )}
              </button>

              {/* Commercial Card */}
              <button
                type="button"
                onClick={() => setContactType("commercial")}
                className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-all duration-200 cursor-pointer text-left ${
                  contactType === "commercial"
                    ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md shadow-green-100 ring-1 ring-green-200"
                    : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                    contactType === "commercial"
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Building2 className="h-7 w-7" />
                </div>
                <div className="text-center">
                  <p
                    className={`text-base font-semibold ${
                      contactType === "commercial" ? "text-green-800 dark:text-green-300" : "text-foreground"
                    }`}
                  >
                    Commercial
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Business, HOA, or property manager
                  </p>
                </div>
                {contactType === "commercial" && (
                  <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-green-500 ring-2 ring-green-200" />
                )}
              </button>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleContinueToDetails}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              handleSubmit(e, {});
            }}
            className="space-y-6 mt-4"
          >
            {contactType === "commercial" && (
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="e.g. Metro Properties LLC"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line1">Street Address</Label>
              <Input
                id="address_line1"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="Enter street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input
                  id="zip"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-between items-center gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("type-selection")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                {onCreateMaintenancePlan && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={createMutation.isPending}
                    onClick={(e) => {
                      const form = (e.currentTarget as HTMLButtonElement).closest("form");
                      if (form && form.checkValidity()) {
                        const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
                        handleSubmit(syntheticEvent, { createMaintenancePlan: true });
                      } else {
                        form?.reportValidity();
                      }
                    }}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    {createMutation.isPending && pendingMaintenancePlan
                      ? "Creating..."
                      : "Create Maintenance Plan"}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  {createMutation.isPending && !pendingMaintenancePlan
                    ? "Creating..."
                    : "Create Lead"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>

      {/* Email Confirmation Dialog */}
      <AlertDialog open={showEmailConfirmation} onOpenChange={setShowEmailConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create without email?</AlertDialogTitle>
            <AlertDialogDescription>
              This contact will be created without an email address. You can add one later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowEmailConfirmation(false);
                proceedWithCreate(pendingSubmitOptions || {});
              }}
            >
              Create without email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
