"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";
import type {
  Contact,
  Location,
  MaintenanceItem,
  MaintenancePlan,
  MaintenanceService,
} from "@/data/types";

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
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ServiceSelection {
  itemId: string;
  name: string;
  included: boolean;
  price: number;
  quantity: number;
  pricingType: MaintenanceItem["pricing_type"];
  unitLabel?: string;
  suggestedMin?: number;
  suggestedMax?: number;
}

interface CreateMaintenancePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanCreated?: (plan: MaintenancePlan) => void;
}

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function CreateMaintenancePlanDialog({
  open,
  onOpenChange,
  onPlanCreated,
}: CreateMaintenancePlanDialogProps) {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Client
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  // Step 2: Services
  const [services, setServices] = useState<ServiceSelection[]>([]);

  // Step 3: Details
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState<MaintenancePlan["frequency"]>("weekly");
  const [billingMethod, setBillingMethod] = useState<string>("per_visit");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [teamId, setTeamId] = useState("");
  const [notes, setNotes] = useState("");

  // Data
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-plan-wizard", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
    enabled: open,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-plan-wizard", currentCompanyId],
    queryFn: () =>
      db.Location.filter({ company_id: currentCompanyId } as Partial<Location>),
    enabled: open,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["maintenance-items-wizard", currentCompanyId],
    queryFn: async () => {
      const all = await db.MaintenanceItem.filter({
        company_id: currentCompanyId,
      });
      return all.filter((i) => i.is_active);
    },
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["teams-plan-wizard"],
    queryFn: () => db.Team.list(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const isCommercial = selectedContact?.contact_type === "commercial";
  const contactLocations = locations.filter(
    (l) => l.contact_id === selectedContactId
  );

  const activeContacts = useMemo(
    () => contacts.filter((c) => !c.isArchived),
    [contacts]
  );

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedContactId("");
      setSelectedLocationId("");
      setServices([]);
      setTitle("");
      setFrequency("weekly");
      setBillingMethod("per_visit");
      setDayOfWeek("");
      setTeamId("");
      setNotes("");
    }
  }, [open]);

  // Build services list from catalog when moving to step 2
  const initServices = () => {
    setServices(
      items.map((item) => ({
        itemId: item.id,
        name: item.name,
        included: false,
        price:
          item.pricing_type === "flat_rate"
            ? item.price_per_visit || 0
            : item.pricing_type === "per_unit"
              ? item.price_per_unit || 0
              : 0,
        quantity: 1,
        pricingType: item.pricing_type,
        unitLabel: item.unit_label,
        suggestedMin: item.suggested_min,
        suggestedMax: item.suggested_max,
      }))
    );
  };

  // Auto-generate title
  const generateTitle = () => {
    if (!selectedContact) return "";
    const name = `${selectedContact.first_name} ${selectedContact.last_name}`;
    const freqLabel =
      frequency.charAt(0).toUpperCase() + frequency.slice(1);
    return `${name} ${freqLabel} Maintenance`;
  };

  // Computed
  const includedServices = services.filter((s) => s.included);
  const totalPerVisit = includedServices.reduce((sum, s) => {
    if (s.pricingType === "per_unit") return sum + s.price * s.quantity;
    return sum + s.price;
  }, 0);

  // Toggle service
  const toggleService = (itemId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.itemId === itemId ? { ...s, included: !s.included } : s
      )
    );
  };

  const updateServicePrice = (itemId: string, price: number) => {
    setServices((prev) =>
      prev.map((s) => (s.itemId === itemId ? { ...s, price } : s))
    );
  };

  const updateServiceQty = (itemId: string, quantity: number) => {
    setServices((prev) =>
      prev.map((s) => (s.itemId === itemId ? { ...s, quantity } : s))
    );
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const planServices: MaintenanceService[] = includedServices.map(
        (s, i) => ({
          id: String(i + 1),
          name: s.name,
          price:
            s.pricingType === "per_unit" ? s.price * s.quantity : s.price,
          included: true,
        })
      );

      return db.MaintenancePlan.create({
        company_id: currentCompanyId,
        contact_id: selectedContactId,
        location_id: selectedLocationId || undefined,
        title: title || generateTitle(),
        status: "active",
        frequency,
        billing_method: billingMethod as MaintenancePlan["billing_method"],
        price_per_visit: totalPerVisit || undefined,
        monthly_price:
          billingMethod === "monthly" ? totalPerVisit * 4 : undefined,
        services: planServices,
        assigned_team_id: teamId || undefined,
        day_of_week: dayOfWeek ? parseInt(dayOfWeek) : undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans-all"] });
      toast.success("Maintenance plan created!");
      onPlanCreated?.(plan);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to create plan.");
    },
  });

  // Step navigation
  const goNext = () => {
    if (step === 1) {
      initServices();
      setStep(2);
    } else if (step === 2) {
      if (!title) setTitle(generateTitle());
      setStep(3);
    }
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const canProceedStep1 =
    !!selectedContactId && (!isCommercial || !!selectedLocationId);
  const canProceedStep2 = includedServices.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Create Maintenance Plan
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    s < step
                      ? "bg-green-600 text-white"
                      : s === step
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    s
                  )}
                </div>
                {s < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      s < step ? "bg-green-600" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {step === 1 && "Select Client"}
              {step === 2 && "Choose Services"}
              {step === 3 && "Plan Details"}
            </span>
          </div>
        </DialogHeader>

        {/* ============ STEP 1: CLIENT ============ */}
        {step === 1 && (
          <div className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={selectedContactId}
                onValueChange={(val) => {
                  setSelectedContactId(val);
                  setSelectedLocationId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {activeContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                      {c.company_name && ` (${c.company_name})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCommercial && contactLocations.length > 0 && (
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {contactLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                        {loc.address_line1 && ` — ${loc.address_line1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedContact && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="font-medium">
                  {selectedContact.first_name} {selectedContact.last_name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {selectedContact.contact_type === "commercial"
                    ? "Commercial"
                    : "Residential"}
                  {selectedContact.phone && ` \u2022 ${selectedContact.phone}`}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={!canProceedStep1}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={goNext}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ============ STEP 2: SERVICES ============ */}
        {step === 2 && (
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Select services to include in this plan. Toggle each service
              on/off and adjust pricing.
            </p>

            <div className="rounded-lg border border-border divide-y divide-border max-h-[400px] overflow-y-auto">
              {services.map((service) => (
                <div
                  key={service.itemId}
                  className={`p-3 space-y-2 ${
                    !service.included ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={service.included}
                      onCheckedChange={() => toggleService(service.itemId)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">
                        {service.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="ml-2 text-[10px] h-4"
                      >
                        {service.pricingType === "per_unit"
                          ? "Per Unit"
                          : service.pricingType === "flat_rate"
                            ? "Flat Rate"
                            : "Variable"}
                      </Badge>
                    </div>
                  </div>

                  {service.included && (
                    <div className="pl-10 flex items-center gap-3">
                      {service.pricingType === "per_unit" && (
                        <>
                          <div className="space-y-1">
                            <span className="text-[11px] text-muted-foreground">
                              Qty ({service.unitLabel || "units"})
                            </span>
                            <Input
                              type="number"
                              min="1"
                              value={service.quantity}
                              onChange={(e) =>
                                updateServiceQty(
                                  service.itemId,
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="h-8 w-20 text-sm"
                            />
                          </div>
                          <span className="text-xs text-muted-foreground mt-4">
                            &times;
                          </span>
                          <div className="space-y-1">
                            <span className="text-[11px] text-muted-foreground">
                              Price/{service.unitLabel || "unit"}
                            </span>
                            <div className="relative">
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
                                    service.itemId,
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-8 w-24 pl-5 text-sm"
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-green-600 mt-4 ml-auto">
                            = ${(service.price * service.quantity).toFixed(2)}
                          </span>
                        </>
                      )}

                      {service.pricingType === "flat_rate" && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-muted-foreground">
                            Price/visit
                          </span>
                          <div className="relative">
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
                                  service.itemId,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-28 pl-5 text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {service.pricingType === "variable" && (
                        <div className="space-y-1">
                          <span className="text-[11px] text-muted-foreground">
                            Price (suggested: $
                            {service.suggestedMin || "?"}\u2013$
                            {service.suggestedMax || "?"})
                          </span>
                          <div className="relative">
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
                                  service.itemId,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-8 w-28 pl-5 text-sm"
                              placeholder="Set price"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center bg-muted rounded-lg p-3">
              <span className="text-sm text-muted-foreground">
                {includedServices.length} service
                {includedServices.length !== 1 ? "s" : ""} selected
              </span>
              <span className="text-lg font-bold text-green-600">
                ${totalPerVisit.toFixed(2)}/visit
              </span>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                disabled={!canProceedStep2}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={goNext}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ============ STEP 3: DETAILS ============ */}
        {step === 3 && (
          <div className="space-y-5 mt-4">
            {/* Plan name */}
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={generateTitle()}
              />
            </div>

            {/* Frequency + Billing */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) =>
                    setFrequency(v as MaintenancePlan["frequency"])
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
              <div className="space-y-2">
                <Label>Billing Method</Label>
                <Select value={billingMethod} onValueChange={setBillingMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_visit">Per Visit</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing summary */}
            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per Visit</span>
                <span className="font-medium">${totalPerVisit.toFixed(2)}</span>
              </div>
              {billingMethod === "monthly" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Monthly (est. 4 visits)
                  </span>
                  <span className="font-medium">
                    ${(totalPerVisit * 4).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Day + Team */}
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Assigned Team</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                className="bg-gradient-to-r from-green-500 to-emerald-600"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Plan"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
