"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";
import { routes } from "@/lib/routes";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, FileText, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/page-header";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

import WizardStepClient from "@/components/bids/wizard-step-client";
import WizardStepItems, {
  type LineItemRow,
  type OverheadRow,
} from "@/components/bids/wizard-step-items";
import WizardStepFinancials from "@/components/bids/wizard-step-financials";
import BidEstimatePanel, { type EstimateData } from "@/components/bids/bid-estimate-panel";

const STEPS = [
  { key: "client", label: "Client Info", num: 1 },
  { key: "items", label: "Line Items", num: 2 },
  { key: "financials", label: "Financials", num: 3 },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export default function BidsCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentCompanyId } = useCompany();

  // Step navigation
  const [currentStep, setCurrentStep] = useState<StepKey>("client");
  const [mobileEstimateOpen, setMobileEstimateOpen] = useState(false);

  // Form state
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lineItems, setLineItems] = useState<LineItemRow[]>([]);
  const [overheadItems, setOverheadItems] = useState<OverheadRow[]>([]);
  const [profitType, setProfitType] = useState<"percent" | "dollar">("percent");
  const [profitValue, setProfitValue] = useState(20);
  const [laborWage, setLaborWage] = useState(0);
  const [laborHoursPerDay, setLaborHoursPerDay] = useState(8);
  const [laborDays, setLaborDays] = useState(1);
  const [depositType, setDepositType] = useState<"percent" | "dollar">("percent");
  const [depositValue, setDepositValue] = useState(50);
  const [achEnabled, setAchEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);

  // Load contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["contacts-wizard", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  // Load company settings for labor defaults
  const { data: settings = [] } = useQuery({
    queryKey: ["company-settings", currentCompanyId],
    queryFn: () => db.CompanySetting.filter({ company_id: currentCompanyId }),
  });

  // Apply company defaults once loaded
  React.useEffect(() => {
    if (settings.length > 0) {
      const s = settings[0];
      if (s.default_hourly_wage && laborWage === 0) setLaborWage(s.default_hourly_wage);
      if (s.default_hours_per_day) setLaborHoursPerDay(s.default_hours_per_day);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Live estimate
  const estimate: EstimateData = useMemo(() => {
    const directCostSubtotal = lineItems.reduce(
      (sum, li) => sum + li.qty * li.unit_cost,
      0
    );

    const overheadTotal = overheadItems
      .filter((oh) => oh.enabled)
      .reduce((sum, oh) => {
        if (oh.type === "percent") return sum + directCostSubtotal * (oh.value / 100);
        return sum + oh.value;
      }, 0);

    const costPlusOverhead = directCostSubtotal + overheadTotal;

    const profitAmount =
      profitType === "percent"
        ? costPlusOverhead * (profitValue / 100)
        : profitValue;

    const bidTotal = costPlusOverhead + profitAmount;

    const depositAmount =
      depositType === "percent"
        ? bidTotal * (depositValue / 100)
        : depositValue;

    const laborTotal = laborWage * laborHoursPerDay * laborDays;

    return {
      directCostSubtotal,
      overheadTotal,
      profitAmount,
      bidTotal,
      depositAmount,
      laborTotal,
    };
  }, [
    lineItems,
    overheadItems,
    profitType,
    profitValue,
    depositType,
    depositValue,
    laborWage,
    laborHoursPerDay,
    laborDays,
  ]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validation
      if (!contactId) throw new Error("Please select a client.");
      if (!title.trim()) throw new Error("Please enter a bid title.");

      const bid = await db.Bid.create({
        company_id: currentCompanyId,
        contact_id: contactId,
        title,
        description: description || undefined,
        status: "draft",
        bid_mode: "detailed",
        direct_cost_subtotal: estimate.directCostSubtotal,
        overhead_total: estimate.overheadTotal,
        profit_type: profitType,
        profit_value: profitValue,
        bid_total: estimate.bidTotal,
        deposit_type: depositType,
        deposit_value: depositValue,
        deposit_amount: estimate.depositAmount,
        payment_method_ach_enabled: achEnabled,
        payment_method_card_enabled: cardEnabled,
        labor_hourly_wage: laborWage,
        labor_hours_per_day: laborHoursPerDay,
        labor_estimate_total: estimate.laborTotal,
      });

      // Bulk create line items
      if (lineItems.length > 0) {
        await db.BidLineItem.bulkCreate(
          lineItems.map((li, i) => ({
            company_id: currentCompanyId,
            bid_id: bid.id,
            item_name: li.item_name,
            category: li.category || undefined,
            unit: li.unit as "ea" | "sq_ft" | "ton" | "hr" | "other",
            qty: li.qty,
            unit_cost: li.unit_cost,
            sell_price: li.sell_price || undefined,
            sort_order: i,
          }))
        );
      }

      // Bulk create overhead items
      if (overheadItems.length > 0) {
        await db.BidOverhead.bulkCreate(
          overheadItems.map((oh) => ({
            company_id: currentCompanyId,
            bid_id: bid.id,
            name: oh.name,
            type: oh.type,
            value: oh.value,
            enabled: oh.enabled,
          }))
        );
      }

      return bid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
      toast.success("Detailed bid created as draft.");
      router.push(routes.bids);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create bid.");
    },
  });

  const handleCreateBid = () => {
    saveMutation.mutate();
  };

  const stepIdx = STEPS.findIndex((s) => s.key === currentStep);

  const goPrev = () => {
    if (stepIdx > 0) setCurrentStep(STEPS[stepIdx - 1].key);
  };
  const goNext = () => {
    if (stepIdx < STEPS.length - 1) setCurrentStep(STEPS[stepIdx + 1].key);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 min-w-0">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(routes.bids)}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Bids
          </Button>
          <PageHeader
            title="Create Detailed Bid"
            subtitle="Build a line-item bid with overhead, profit, and labor calculations"
            actions={
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
            }
          />
        </div>

        {/* Stepper */}
        <div className="flex items-center overflow-x-auto pb-1">
          {STEPS.map((step, i) => {
            const isActive = step.key === currentStep;
            const isPast = i < stepIdx;
            return (
              <React.Fragment key={step.key}>
                {i > 0 && (
                  <div
                    className={`hidden sm:block w-8 h-0.5 flex-shrink-0 mx-1 transition-colors ${
                      i <= stepIdx
                        ? "bg-green-400 dark:bg-green-600"
                        : "bg-border"
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                      : isPast
                        ? "bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40 hover:shadow-md"
                        : "bg-muted text-muted-foreground border border-border hover:bg-accent hover:shadow-md"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive
                        ? "bg-white/20"
                        : isPast
                          ? "bg-green-200 dark:bg-green-800"
                          : "bg-background"
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : step.num}
                  </span>
                  {step.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wizard content */}
          <div className="lg:col-span-2 space-y-4">
            {currentStep === "client" && (
              <WizardStepClient
                contactId={contactId}
                title={title}
                description={description}
                contacts={contacts}
                isLoading={contactsLoading}
                onContactChange={setContactId}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
              />
            )}
            {currentStep === "items" && (
              <WizardStepItems
                lineItems={lineItems}
                overheadItems={overheadItems}
                onLineItemsChange={setLineItems}
                onOverheadChange={setOverheadItems}
              />
            )}
            {currentStep === "financials" && (
              <WizardStepFinancials
                profitType={profitType}
                profitValue={profitValue}
                laborWage={laborWage}
                laborHoursPerDay={laborHoursPerDay}
                laborDays={laborDays}
                depositType={depositType}
                depositValue={depositValue}
                achEnabled={achEnabled}
                cardEnabled={cardEnabled}
                computedProfitAmount={estimate.profitAmount}
                computedDepositAmount={estimate.depositAmount}
                computedLaborTotal={estimate.laborTotal}
                onProfitTypeChange={setProfitType}
                onProfitValueChange={setProfitValue}
                onLaborWageChange={setLaborWage}
                onLaborHoursPerDayChange={setLaborHoursPerDay}
                onLaborDaysChange={setLaborDays}
                onDepositTypeChange={setDepositType}
                onDepositValueChange={setDepositValue}
                onAchChange={setAchEnabled}
                onCardChange={setCardEnabled}
              />
            )}

            {/* Step navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={stepIdx === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              {stepIdx < STEPS.length - 1 ? (
                <Button
                  onClick={goNext}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateBid}
                  disabled={saveMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Create Bid from Estimate"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Estimate panel — desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <BidEstimatePanel
                estimate={estimate}
                onCreateBid={handleCreateBid}
                isSaving={saveMutation.isPending}
              />
            </div>
          </div>
        </div>

        {/* Mobile sticky bottom bar */}
        <div
          className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t border-border p-3 z-40 shadow-lg cursor-pointer"
          onClick={() => setMobileEstimateOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setMobileEstimateOpen(true); }}
        >
          <BidEstimatePanel
            estimate={estimate}
            onCreateBid={handleCreateBid}
            isSaving={saveMutation.isPending}
            compact
          />
        </div>

        {/* Mobile estimate sheet */}
        <Sheet open={mobileEstimateOpen} onOpenChange={setMobileEstimateOpen}>
          <SheetContent side="bottom" className="max-h-[80vh]" showCloseButton>
            <SheetHeader>
              <SheetTitle>Estimate Breakdown</SheetTitle>
              <SheetDescription>Review your bid totals</SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <BidEstimatePanel
                estimate={estimate}
                onCreateBid={() => {
                  setMobileEstimateOpen(false);
                  handleCreateBid();
                }}
                isSaving={saveMutation.isPending}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Bottom spacer for mobile sticky bar */}
        <div className="h-20 lg:hidden" />
      </div>
    </div>
  );
}
