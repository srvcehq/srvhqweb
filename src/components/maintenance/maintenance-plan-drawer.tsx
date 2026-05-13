"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wrench,
  Calendar,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";
import {
  DAY_OF_WEEK_LABELS,
  FREQUENCY_LABELS,
  nextVisitDates,
  type MaintenanceFrequency,
} from "@/lib/maintenance-schedule";
import type { MaintenanceItem, MaintenancePlan } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type SectionKey =
  | "basics"
  | "schedule"
  | "services"
  | "pricing"
  | "upsells"
  | "preview";

const FREQUENCIES: MaintenanceFrequency[] = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "annually",
  "custom",
];

type PricingType = "per_visit" | "flat_monthly" | "flat_seasonal" | "custom";
const PRICING_TYPES: { key: PricingType; label: string; billing_method: "per_visit" | "monthly" | "quarterly" | "annually" }[] = [
  { key: "per_visit", label: "Per-Visit Billing", billing_method: "per_visit" },
  { key: "flat_monthly", label: "Flat Monthly Billing", billing_method: "monthly" },
  { key: "flat_seasonal", label: "Flat Seasonal Billing", billing_method: "quarterly" },
  { key: "custom", label: "Custom", billing_method: "per_visit" },
];

type BillingTiming = "after_complete" | "on_scheduled";

interface PlanService {
  id: string; // maintenance_item id
  name: string;
  pricing_type: MaintenanceItem["pricing_type"];
  price: number; // per-client price
  qty: number;
  notes: string;
  included: true;
}

interface PlanUpsell {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  scheduled_date: string; // yyyy-MM-dd
  frequency: "one_time";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function MaintenancePlanDrawer({
  open,
  onOpenChange,
  contactId,
  contactName,
  locationId,
  editPlan,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected contact. If omitted, the drawer asks which customer. */
  contactId?: string;
  contactName?: string;
  locationId?: string;
  /** When set, the drawer edits this plan instead of creating a new one. */
  editPlan?: MaintenancePlan;
  onCreated?: () => void;
}) {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompany();
  const isEdit = !!editPlan;

  const [section, setSection] = useState<SectionKey>("basics");
  const [saving, setSaving] = useState(false);

  // Plan basics
  const [pickedContactId, setPickedContactId] = useState<string>(contactId ?? "");
  const [planName, setPlanName] = useState("");
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newNameDraft, setNewNameDraft] = useState("");

  // Saved plan-name templates (company_settings.maintenance_plan_names)
  const { data: savedPlanNames = [] } = useQuery<string[]>({
    queryKey: ["plan-name-templates"],
    queryFn: async () => {
      try {
        const rows = await db.CompanySetting.list();
        return ((rows[0] as { maintenance_plan_names?: string[] } | undefined)
          ?.maintenance_plan_names ?? []) as string[];
      } catch {
        return [];
      }
    },
    enabled: open,
  });

  async function persistPlanNames(next: string[]) {
    if (!currentCompanyId) return;
    try {
      await db.CompanySetting.update(currentCompanyId, {
        maintenance_plan_names: next,
      } as never);
      queryClient.setQueryData(["plan-name-templates"], next);
    } catch (err) {
      // column not migrated yet — keep the chosen name working locally
      console.warn("[maintenance-plan] couldn't persist plan-name templates", err);
    }
  }

  async function addPlanNameTemplate(name: string) {
    const n = name.trim();
    if (!n) return;
    if (!savedPlanNames.includes(n)) await persistPlanNames([...savedPlanNames, n]);
    setPlanName(n);
    setShowNameModal(false);
    setNewNameDraft("");
    setNameMenuOpen(false);
  }

  async function deletePlanNameTemplate(name: string) {
    await persistPlanNames(savedPlanNames.filter((x) => x !== name));
    if (planName === name) setPlanName("");
  }

  // Schedule
  const [frequency, setFrequency] = useState<MaintenanceFrequency>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1); // Monday
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [seasonEnd, setSeasonEnd] = useState<string>("");

  // Services
  const [services, setServices] = useState<PlanService[]>([]);
  const [timePerVisit, setTimePerVisit] = useState<string>("45");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [creatingService, setCreatingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");

  // Pricing
  const [pricingType, setPricingType] = useState<PricingType>("per_visit");
  const [billingTiming, setBillingTiming] = useState<BillingTiming>("after_complete");

  // Upsells
  const [upsells, setUpsells] = useState<PlanUpsell[]>([]);
  const [upsellForm, setUpsellForm] = useState({ name: "", price: "", duration: "", date: "" });

  // ---- data ----
  const { data: serviceCatalog = [] } = useQuery({
    queryKey: ["maintenance-items"],
    queryFn: () => db.MaintenanceItem.list(),
    enabled: open,
  });
  const { data: allContacts = [] } = useQuery({
    queryKey: ["contacts-for-plan"],
    queryFn: () => db.Contact.list(),
    enabled: open && !contactId,
  });

  // ---- prefill when editing ----
  useEffect(() => {
    if (!open || !editPlan) return;
    setSection("basics");
    setPickedContactId(editPlan.contact_id);
    setPlanName(editPlan.title ?? "");
    setFrequency((editPlan.frequency as MaintenanceFrequency) ?? "weekly");
    setDayOfWeek(editPlan.day_of_week ?? 1);
    setStartDate(editPlan.start_date ?? new Date().toISOString().slice(0, 10));
    setSeasonEnd(editPlan.end_date ?? "");
    setServices(((editPlan.services ?? []) as unknown as PlanService[]).map((s) => ({
      id: s.id,
      name: s.name,
      pricing_type: s.pricing_type ?? "flat_rate",
      price: Number(s.price) || 0,
      qty: Number(s.qty) || 1,
      notes: s.notes ?? "",
      included: true,
    })));
    setUpsells(((editPlan.upsells ?? []) as unknown as PlanUpsell[]).map((u) => ({
      id: u.id ?? crypto.randomUUID(),
      name: u.name,
      price: Number(u.price) || 0,
      duration_minutes: Number(u.duration_minutes) || 0,
      scheduled_date: u.scheduled_date ?? "",
      frequency: "one_time" as const,
    })));
    setPricingType(
      editPlan.billing_method === "monthly"
        ? "flat_monthly"
        : editPlan.billing_method === "quarterly" || editPlan.billing_method === "annually"
          ? "flat_seasonal"
          : "per_visit"
    );
    setBillingTiming("after_complete");
    setSpecialInstructions((editPlan.notes ?? "").replace(/\s*Pricing:[\s\S]*$/, "").trim());
    setTimePerVisit("45");
  }, [open, editPlan]);

  // ---- derived ----
  const pricePerVisit = useMemo(
    () => services.reduce((sum, s) => sum + (Number(s.price) || 0) * (Number(s.qty) || 0), 0),
    [services]
  );
  const baseDuration = Number(timePerVisit) || 0;

  const previewDates = useMemo(() => {
    if (!startDate) return [];
    return nextVisitDates({ startDate, frequency, dayOfWeek, count: 8, endDate: seasonEnd || null });
  }, [startDate, frequency, dayOfWeek, seasonEnd]);

  const canSave =
    !!pickedContactId &&
    planName.trim().length > 0 &&
    !!startDate &&
    services.length > 0 &&
    !saving;

  function reset() {
    setSection("basics");
    setPlanName("");
    setFrequency("weekly");
    setDayOfWeek(1);
    setStartDate(new Date().toISOString().slice(0, 10));
    setSeasonEnd("");
    setServices([]);
    setTimePerVisit("45");
    setSpecialInstructions("");
    setCreatingService(false);
    setNewServiceName("");
    setNewServicePrice("");
    setPricingType("per_visit");
    setBillingTiming("after_complete");
    setUpsells([]);
    setUpsellForm({ name: "", price: "", duration: "", date: "" });
    if (!contactId) setPickedContactId("");
  }

  function addServiceFromCatalog(itemId: string) {
    if (itemId === "__new__") {
      setCreatingService(true);
      return;
    }
    const item = serviceCatalog.find((i) => i.id === itemId);
    if (!item) return;
    if (services.some((s) => s.id === item.id)) return;
    const price = item.price_per_visit ?? item.price_per_unit ?? 0;
    setServices((prev) => [
      ...prev,
      { id: item.id, name: item.name, pricing_type: item.pricing_type, price, qty: 1, notes: "", included: true },
    ]);
  }

  async function createNewService() {
    const name = newServiceName.trim();
    if (!name) return;
    const price = Number(newServicePrice) || 0;
    try {
      const created = await db.MaintenanceItem.create({
        name,
        pricing_type: "flat_rate",
        price_per_visit: price,
        is_active: true,
      });
      queryClient.invalidateQueries({ queryKey: ["maintenance-items"] });
      setServices((prev) => [
        ...prev,
        { id: created.id, name: created.name, pricing_type: "flat_rate", price, qty: 1, notes: "", included: true },
      ]);
      setCreatingService(false);
      setNewServiceName("");
      setNewServicePrice("");
      toast.success("Service added to your catalog");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create the service.");
    }
  }

  function addUpsell() {
    const name = upsellForm.name.trim();
    if (!name || !upsellForm.date) {
      toast.error("Give the upsell a name and a date.");
      return;
    }
    setUpsells((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        price: Number(upsellForm.price) || 0,
        duration_minutes: Number(upsellForm.duration) || 0,
        scheduled_date: upsellForm.date,
        frequency: "one_time",
      },
    ]);
    setUpsellForm({ name: "", price: "", duration: "", date: "" });
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const pt = PRICING_TYPES.find((p) => p.key === pricingType)!;
      const notesParts = [
        specialInstructions.trim(),
        `Pricing: ${pt.label}; Billing: ${billingTiming === "after_complete" ? "auto after marked complete" : "auto on scheduled visits"}.`,
      ].filter(Boolean);
      const planFields = {
        contact_id: pickedContactId,
        location_id: locationId,
        title: planName.trim(),
        status: "active" as const,
        frequency,
        day_of_week: dayOfWeek,
        start_date: startDate,
        end_date: seasonEnd || undefined,
        billing_method: pt.billing_method,
        price_per_visit: pricePerVisit,
        monthly_price: pricingType === "flat_monthly" ? pricePerVisit : undefined,
        notes: notesParts.join(" "),
        services: services.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          included: true,
          qty: s.qty,
          notes: s.notes,
          pricing_type: s.pricing_type,
        })) as never,
        upsells: upsells.map((u) => ({
          id: u.id,
          name: u.name,
          price: u.price,
          frequency: "one_time",
          duration_minutes: u.duration_minutes,
          scheduled_date: u.scheduled_date,
        })) as never,
      };

      if (isEdit && editPlan) {
        await db.MaintenancePlan.update(editPlan.id, planFields);
        // (existing visits are left as-is; schedule changes apply going forward)
      } else {
        const plan = await db.MaintenancePlan.create(planFields);
        const serviceNames = services.map((s) => s.name).join(", ");
        for (const date of previewDates) {
          const ups = upsells.find((u) => u.scheduled_date === date);
          await db.MaintenanceVisit.create({
            maintenance_plan_id: plan.id,
            contact_id: pickedContactId,
            location_id: locationId,
            visit_date: date,
            status: "scheduled",
            service_performed: ups ? `${serviceNames} + ${ups.name}` : serviceNames,
            duration_minutes: baseDuration + (ups?.duration_minutes ?? 0),
            amountDue: pricePerVisit + (ups?.price ?? 0),
            payment_status: "unpaid",
          });
        }
      }

      // refresh everything that shows maintenance plans / visits
      queryClient.invalidateQueries({ queryKey: ["maintenance-plans"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-visits"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(isEdit ? "Maintenance plan updated" : "Maintenance plan created");
      onCreated?.();
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error("[maintenance-plan] save failed", err);
      toast.error(err instanceof Error ? err.message : "Couldn't save the plan.");
    } finally {
      setSaving(false);
    }
  }

  const dateFmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  /* ---------------- section header (accordion) ---------------- */
  const SectionShell = ({
    k,
    icon,
    title,
    accent,
    children,
  }: {
    k: SectionKey;
    icon: React.ReactNode;
    title: string;
    accent: string;
    children: React.ReactNode;
  }) => {
    const isOpen = section === k;
    return (
      <div
        className={`rounded-xl border ${isOpen ? "border-transparent ring-2 ring-offset-1" : "border-gray-200"}`}
        style={isOpen ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
      >
        <button
          type="button"
          onClick={() => setSection(k)}
          className="flex w-full items-center justify-between rounded-t-xl px-4 py-3 text-left"
          style={isOpen ? { background: accent + "1a" } : undefined}
        >
          <span className="flex items-center gap-2 font-semibold text-gray-900">
            {icon} {title}
          </span>
          {!isOpen && <span className="text-xs text-gray-500">Edit</span>}
        </button>
        {isOpen && <div className="px-4 pb-4 pt-1 space-y-4">{children}</div>}
      </div>
    );
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto bg-white p-0"
      >
        <SheetHeader className="bg-emerald-50 border-b border-emerald-100 px-6 py-5">
          <SheetTitle className="text-xl">{isEdit ? "Edit Maintenance Plan" : "Create Maintenance Plan"}</SheetTitle>
          <SheetDescription>
            Step-by-step guided setup{contactName ? ` for ${contactName}` : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 py-5 space-y-3">
          {/* 1. Plan Basics */}
          <SectionShell k="basics" icon={<Wrench className="h-4 w-4" />} title="Plan Basics" accent="#10b981">
            {!contactId && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Customer *</Label>
                <Select value={pickedContactId} onValueChange={setPickedContactId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allContacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || c.email || c.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-gray-700">Plan Name *</Label>
              <div className="relative mt-1">
                <button
                  type="button"
                  onClick={() => setNameMenuOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm"
                >
                  <span className={planName ? "text-gray-900" : "text-muted-foreground"}>
                    {planName || "Select or create plan name…"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                {nameMenuOpen && (
                  <>
                    {/* click-away */}
                    <div className="fixed inset-0 z-10" onClick={() => setNameMenuOpen(false)} />
                    <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-input bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setNameMenuOpen(false);
                          setNewNameDraft("");
                          setShowNameModal(true);
                        }}
                        className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-sm font-medium hover:bg-gray-50"
                      >
                        <Plus className="h-4 w-4" /> Create new plan name
                      </button>
                      {savedPlanNames.length === 0 ? (
                        <p className="px-3 py-2.5 text-xs text-muted-foreground">No saved plan names yet.</p>
                      ) : (
                        savedPlanNames.map((n) => (
                          <div key={n} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">
                            <button
                              type="button"
                              onClick={() => {
                                setPlanName(n);
                                setNameMenuOpen(false);
                              }}
                              className="flex-1 text-left"
                            >
                              {n}
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePlanNameTemplate(n)}
                              className="ml-2 text-rose-400 hover:text-rose-600"
                              aria-label={`Delete ${n}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Give this plan a clear name for easy reference — pick a saved one or create a new one.</p>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setSection("schedule")} disabled={!pickedContactId || !planName.trim()}>
                Next →
              </Button>
            </div>
          </SectionShell>

          {/* 2. Frequency & Schedule */}
          <SectionShell k="schedule" icon={<Calendar className="h-4 w-4" />} title="Frequency & Schedule" accent="#3b82f6">
            <div>
              <Label className="text-sm font-medium text-gray-700">Service Frequency *</Label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      frequency === f
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {FREQUENCY_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Day of Week *</Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_OF_WEEK_LABELS.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date" className="text-sm font-medium text-gray-700">Start Date *</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="season-end" className="text-sm font-medium text-gray-700">Season End (optional)</Label>
              <Input id="season-end" type="date" value={seasonEnd} onChange={(e) => setSeasonEnd(e.target.value)} className="mt-1" />
              <p className="mt-1 text-xs text-gray-500">Leave blank for year-round.</p>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setSection("services")}>Next →</Button>
            </div>
          </SectionShell>

          {/* 3. Service Details */}
          <SectionShell k="services" icon={<CheckCircle2 className="h-4 w-4" />} title="Service Details" accent="#a855f7">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Services</span>
              <span className="text-sm text-gray-500">
                Total per visit <span className="font-bold text-emerald-600">${pricePerVisit.toFixed(2)}</span>
              </span>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Add Service</Label>
              <Select value="" onValueChange={addServiceFromCatalog}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a service to add…" /></SelectTrigger>
                <SelectContent>
                  {serviceCatalog
                    .filter((i) => i.is_active && !services.some((s) => s.id === i.id))
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  <SelectItem value="__new__">+ Create a new service…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {creatingService && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="New service name" value={newServiceName} onChange={(e) => setNewServiceName(e.target.value)} />
                  <Input placeholder="Default price" type="number" value={newServicePrice} onChange={(e) => setNewServicePrice(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={createNewService} disabled={!newServiceName.trim()}>Add to catalog</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setCreatingService(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {services.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                No services added yet — pick one above to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((s, idx) => (
                  <div key={s.id} className="rounded-lg border-l-4 border-emerald-400 border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium text-gray-900">
                        {s.name}
                        <Badge variant="secondary" className="text-[10px] uppercase">{s.pricing_type.replace("_", " ")}</Badge>
                      </span>
                      <button type="button" onClick={() => setServices((prev) => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600">Price for this client *</Label>
                        <Input type="number" value={s.price} onChange={(e) => setServices((prev) => prev.map((x, i) => i === idx ? { ...x, price: Number(e.target.value) } : x))} className="mt-0.5 h-8" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Qty</Label>
                        <Input type="number" value={s.qty} onChange={(e) => setServices((prev) => prev.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) || 1 } : x))} className="mt-0.5 h-8" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Line total</Label>
                        <div className="mt-0.5 h-8 flex items-center font-semibold text-emerald-600 text-sm">${((Number(s.price) || 0) * (Number(s.qty) || 0)).toFixed(2)}</div>
                      </div>
                    </div>
                    <Input placeholder="Optional notes (discounts, special conditions)" value={s.notes} onChange={(e) => setServices((prev) => prev.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))} className="mt-2 h-8 text-sm" />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tpv" className="text-sm font-medium text-gray-700">Time per Visit (minutes)</Label>
                <Input id="tpv" type="number" placeholder="e.g. 45" value={timePerVisit} onChange={(e) => setTimePerVisit(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="si" className="text-sm font-medium text-gray-700">Special Instructions</Label>
              <Textarea id="si" rows={2} value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setSection("pricing")} disabled={services.length === 0}>Next →</Button>
            </div>
          </SectionShell>

          {/* 4. Pricing Model */}
          <SectionShell k="pricing" icon={<DollarSign className="h-4 w-4" />} title="Pricing Model" accent="#10b981">
            <div>
              <Label className="text-sm font-medium text-gray-700">Pricing Type *</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {PRICING_TYPES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPricingType(p.key)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      pricingType === p.key ? "bg-emerald-600 text-white border-emerald-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Calculated price per visit</p>
                <p className="text-xs text-gray-500">Based on the selected services</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">${pricePerVisit.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Billing Method *</Label>
              <div className="mt-1 space-y-2">
                {[
                  { k: "after_complete" as BillingTiming, t: "Automatically bill after marked complete", d: "Invoice is generated only after the visit is marked complete.", rec: true },
                  { k: "on_scheduled" as BillingTiming, t: "Automatically bill based on scheduled visits", d: "Invoices are generated automatically based on the scheduled visit timing." },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    type="button"
                    onClick={() => setBillingTiming(opt.k)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      billingTiming === opt.k ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`mt-0.5 h-4 w-4 rounded-full border-2 ${billingTiming === opt.k ? "border-emerald-600 bg-emerald-600" : "border-gray-300"}`} />
                    <span className="flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        {opt.t}
                        {opt.rec && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Recommended</Badge>}
                      </span>
                      <span className="block text-xs text-gray-500">{opt.d}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setSection("upsells")}>Next →</Button>
            </div>
          </SectionShell>

          {/* 5. Optional Upsells */}
          <SectionShell k="upsells" icon={<Plus className="h-4 w-4" />} title="Optional Upsells & One-Time Services" accent="#6366f1">
            <p className="text-xs text-gray-500">Upsells in form: {upsells.length}. Optional services you can add to a single upcoming visit.</p>
            {upsells.length > 0 && (
              <div className="space-y-2">
                {upsells.map((u, i) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <span>{u.name} — ${u.price.toFixed(2)} · {dateFmt(u.scheduled_date)}{u.duration_minutes ? ` · +${u.duration_minutes} min` : ""}</span>
                    <button type="button" onClick={() => setUpsells((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div>
                <Label className="text-xs text-gray-600">Upsell Name *</Label>
                <Input value={upsellForm.name} onChange={(e) => setUpsellForm((f) => ({ ...f, name: e.target.value }))} className="mt-0.5 h-8" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">Price *</Label>
                  <Input type="number" value={upsellForm.price} onChange={(e) => setUpsellForm((f) => ({ ...f, price: e.target.value }))} className="mt-0.5 h-8" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Additional Duration (min)</Label>
                  <Input type="number" value={upsellForm.duration} onChange={(e) => setUpsellForm((f) => ({ ...f, duration: e.target.value }))} className="mt-0.5 h-8" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Scheduled Date *</Label>
                <Input type="date" value={upsellForm.date} onChange={(e) => setUpsellForm((f) => ({ ...f, date: e.target.value }))} className="mt-0.5 h-8" />
              </div>
              <Button type="button" size="sm" onClick={addUpsell} disabled={!upsellForm.name.trim() || !upsellForm.date}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Upsell
              </Button>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setSection("preview")}>Next →</Button>
            </div>
          </SectionShell>

          {/* 6. Schedule Preview & Finalize */}
          <SectionShell k="preview" icon={<CalendarDays className="h-4 w-4" />} title="Schedule Preview & Finalize" accent="#3b82f6">
            <p className="text-sm text-gray-700">
              This plan will schedule <span className="font-medium">{FREQUENCY_LABELS[frequency]}</span> service on{" "}
              <span className="font-medium">{DAY_OF_WEEK_LABELS[dayOfWeek]}s</span>.
            </p>
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">Next {previewDates.length} visits:</p>
              <ul className="space-y-1.5 text-sm">
                {previewDates.map((d) => {
                  const ups = upsells.find((u) => u.scheduled_date === d);
                  const dur = baseDuration + (ups?.duration_minutes ?? 0);
                  return (
                    <li key={d} className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-gray-700">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" /> {dateFmt(d)}
                      </span>
                      <span className="text-gray-500">
                        {ups ? <>{dur} min <span className="text-gray-400">(+{ups.duration_minutes})</span> <Badge variant="secondary" className="text-[10px] ml-1">Upsell</Badge></> : `${dur} min`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {upsells.length > 0 && (
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">Upcoming Optional Services</p>
                {upsells.map((u) => (
                  <p key={u.id} className="text-sm text-gray-600 border-l-2 border-gray-200 pl-2">
                    {u.name} — One-time · Scheduled {dateFmt(u.scheduled_date)} · ${u.price.toFixed(2)}
                  </p>
                ))}
              </div>
            )}
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm flex items-center justify-between">
              <span className="text-gray-600">Per-visit charge</span>
              <span className="font-semibold text-gray-900">${pricePerVisit.toFixed(2)}</span>
            </div>
          </SectionShell>
        </div>

        <SheetFooter className="border-t border-gray-200 px-6 py-4 sticky bottom-0 bg-white flex-row justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white disabled:opacity-60"
          >
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : isEdit ? "Save Changes" : "Save Maintenance Plan"}
          </Button>
        </SheetFooter>
      </SheetContent>

      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Plan Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <Label htmlFor="new-plan-name" className="text-sm font-medium text-gray-700">Plan Name *</Label>
            <Input
              id="new-plan-name"
              autoFocus
              placeholder="e.g., Weekly Service, Monthly Cleaning"
              value={newNameDraft}
              onChange={(e) => setNewNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newNameDraft.trim()) {
                  e.preventDefault();
                  void addPlanNameTemplate(newNameDraft);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNameModal(false)}>Cancel</Button>
            <Button
              type="button"
              onClick={() => void addPlanNameTemplate(newNameDraft)}
              disabled={!newNameDraft.trim()}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
