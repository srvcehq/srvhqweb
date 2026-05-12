"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Briefcase,
  CreditCard,
  Users,
  LayoutDashboard,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand/brand-logo";
import { toast } from "sonner";

const TOTAL_STEPS = 5;
const STEP_LABELS = [
  "Welcome",
  "Business Info",
  "Stripe",
  "First Customer",
  "Done",
];

type BusinessInfo = {
  company_name: string;
  business_phone: string;
  business_address: string;
};

interface OnboardingWizardProps {
  initialStep: number;
  stripeStatusFromUrl: string | null;
  companyId: string | null;
  initialBusinessInfo: BusinessInfo;
  stripeConnected: boolean;
  stripeAccountId: string | null;
}

export default function OnboardingWizard({
  initialStep,
  stripeStatusFromUrl,
  companyId,
  initialBusinessInfo,
  stripeConnected,
  stripeAccountId,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [businessInfo, setBusinessInfo] =
    useState<BusinessInfo>(initialBusinessInfo);
  const [isCompleting, startCompleting] = useTransition();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleGoToContacts = () => {
    router.push("/contacts?from=onboarding");
  };

  const handleDone = () => {
    startCompleting(async () => {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      if (!res.ok) {
        toast.error("Couldn't finalize setup. Please try again.");
        return;
      }
      router.push("/dashboard");
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-7 relative border border-gray-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <StepProgress current={step} />
      <StepLabel step={step} />

      <div
        key={step}
        className="animate-in fade-in slide-in-from-right-2 duration-300"
      >
        {step === 1 && <WelcomeStep onNext={next} />}
        {step === 2 && (
          <BusinessInfoStep
            onNext={next}
            onBack={back}
            value={businessInfo}
            onChange={setBusinessInfo}
          />
        )}
        {step === 3 && (
          <ConnectStripeStep
            onNext={next}
            onBack={back}
            companyId={companyId ?? "default"}
            existingAccountId={stripeAccountId}
            stripeConnected={stripeConnected}
            stripeStatusFromUrl={stripeStatusFromUrl}
          />
        )}
        {step === 4 && (
          <FirstCustomerStep
            onNext={next}
            onBack={back}
            onGoToContacts={handleGoToContacts}
          />
        )}
        {step === 5 && (
          <DoneStep onDone={handleDone} isCompleting={isCompleting} />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Shared wizard chrome                                                   */
/* -------------------------------------------------------------------- */

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all
              ${
                i + 1 < current
                  ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white"
                  : i + 1 === current
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white ring-4 ring-green-100"
                    : "bg-gray-100 text-gray-400"
              }`}
          >
            {i + 1 < current ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              i + 1
            )}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 rounded transition-all ${
                i + 1 < current ? "bg-green-400" : "bg-gray-200"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function StepLabel({ step }: { step: number }) {
  return (
    <p className="text-xs text-gray-500 text-center mb-5">
      Step {step} of {TOTAL_STEPS} —{" "}
      <span className="font-medium text-gray-700">
        {STEP_LABELS[step - 1]}
      </span>
    </p>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4 -ml-1"
    >
      <ChevronLeft className="w-4 h-4" />
      Back
    </button>
  );
}

/* -------------------------------------------------------------------- */
/* Step 1: Welcome                                                        */
/* -------------------------------------------------------------------- */

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 mb-4">
        <BrandMark size={32} />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
        Welcome to SRVCE HQ
      </h1>
      <p className="text-gray-600 text-sm max-w-sm mb-7 leading-relaxed">
        Your all-in-one field service platform. Let&apos;s get your account set
        up in just a few steps.
      </p>
      <Button
        onClick={onNext}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-10 shadow-md font-medium"
      >
        Get Started
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Step 2: Business Info                                                  */
/* -------------------------------------------------------------------- */

function BusinessInfoStep({
  onNext,
  onBack,
  value,
  onChange,
}: {
  onNext: () => void;
  onBack: () => void;
  value: BusinessInfo;
  onChange: (v: BusinessInfo) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const canSubmit = value.company_name.trim().length > 0 && !isSaving;

  async function handleContinue() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/onboarding/business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          (data as { error?: string }).error ?? "Couldn't save business info."
        );
        return;
      }
      onNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton onBack={onBack} />
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Business Info</h2>
          <p className="text-xs text-gray-500">Tell us about your business</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <Label
            htmlFor="biz-name"
            className="text-sm font-medium text-gray-700"
          >
            Business Name
          </Label>
          <Input
            id="biz-name"
            placeholder="e.g. Green Thumb Landscaping"
            value={value.company_name}
            onChange={(e) =>
              onChange({ ...value, company_name: e.target.value })
            }
            className="mt-1 border-gray-200 focus:border-green-500"
            required
          />
        </div>
        <div>
          <Label
            htmlFor="biz-phone"
            className="text-sm font-medium text-gray-700"
          >
            Phone Number
          </Label>
          <Input
            id="biz-phone"
            placeholder="(555) 555-5555"
            value={value.business_phone}
            onChange={(e) =>
              onChange({ ...value, business_phone: e.target.value })
            }
            className="mt-1 border-gray-200 focus:border-green-500"
          />
        </div>
        <div>
          <Label
            htmlFor="biz-address"
            className="text-sm font-medium text-gray-700"
          >
            Business Address
          </Label>
          <Input
            id="biz-address"
            placeholder="123 Main St, Denver, CO 80202"
            value={value.business_address}
            onChange={(e) =>
              onChange({ ...value, business_address: e.target.value })
            }
            className="mt-1 border-gray-200 focus:border-green-500"
          />
        </div>
      </div>
      <Button
        onClick={handleContinue}
        disabled={!canSubmit}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white mt-1 shadow-sm font-medium disabled:opacity-60"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Step 3: Connect Stripe                                                 */
/* -------------------------------------------------------------------- */

function ConnectStripeStep({
  onNext,
  onBack,
  companyId,
  existingAccountId,
  stripeConnected,
  stripeStatusFromUrl,
}: {
  onNext: () => void;
  onBack: () => void;
  companyId: string;
  existingAccountId: string | null;
  stripeConnected: boolean;
  stripeStatusFromUrl: string | null;
}) {
  const [isConnecting, setIsConnecting] = useState(false);

  const justReturnedFromStripe = stripeStatusFromUrl === "connected";
  const cancelledStripe = stripeStatusFromUrl === "refresh";

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          existingAccountId: existingAccountId ?? undefined,
          from: "onboarding",
        }),
      });
      if (res.status === 429) {
        toast.error("Too many attempts. Please wait a moment and try again.");
        return;
      }
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Failed to start Stripe onboarding.");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start Stripe onboarding."
      );
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton onBack={onBack} />
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Connect Stripe</h2>
          <p className="text-xs text-gray-500">
            Accept payments from your customers
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 text-center border border-gray-200">
        {stripeConnected || justReturnedFromStripe ? (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-emerald-700 font-medium text-sm">
              Stripe account connected
            </p>
            <p className="text-gray-500 text-xs mt-1">
              You&apos;re ready to accept deposits, invoices, and recurring
              payments.
            </p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-3">💳</div>
            <p className="text-gray-600 text-sm mb-4 max-w-xs mx-auto leading-relaxed">
              Connect your Stripe account to accept deposits, invoices, and
              maintenance payments directly through SRVCE HQ.
            </p>
            {cancelledStripe && (
              <p className="text-amber-700 text-xs mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Stripe onboarding was cancelled. You can try again or skip for
                now.
              </p>
            )}
            <Button
              variant="outline"
              className="border-violet-300 text-violet-700 hover:bg-violet-50 font-medium px-8"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : existingAccountId ? (
                "Continue Stripe Setup"
              ) : (
                "Connect Stripe"
              )}
            </Button>
          </>
        )}
      </div>

      <Button
        onClick={onNext}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-sm font-medium"
      >
        Continue
      </Button>
      {!stripeConnected && !justReturnedFromStripe && (
        <button
          onClick={onNext}
          className="text-xs text-gray-400 hover:text-gray-500 text-center -mt-1 transition-colors"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Step 4: Add First Customer                                             */
/* -------------------------------------------------------------------- */

function FirstCustomerStep({
  onNext,
  onBack,
  onGoToContacts,
}: {
  onNext: () => void;
  onBack: () => void;
  onGoToContacts: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <BackButton onBack={onBack} />
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Add your first customer
          </h2>
          <p className="text-gray-500 text-sm mt-1.5 max-w-sm leading-relaxed">
            Your contacts are the heart of SRVCE HQ — add a customer to get
            started with bids, projects, and maintenance plans.
          </p>
        </div>
        <Button
          onClick={onGoToContacts}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 shadow-sm font-medium"
        >
          Go to Contacts
        </Button>
        <button
          onClick={onNext}
          className="text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          I&apos;ll do this later
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Step 5: Done                                                            */
/* -------------------------------------------------------------------- */

function DoneStep({
  onDone,
  isCompleting,
}: {
  onDone: () => void;
  isCompleting: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-2">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          You&apos;re all set! 🎉
        </h2>
        <p className="text-gray-500 text-sm mt-1.5 max-w-sm leading-relaxed">
          Your SRVCE HQ account is ready to go. Head to your dashboard to see
          what&apos;s happening.
        </p>
      </div>
      <Button
        onClick={onDone}
        disabled={isCompleting}
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-10 shadow-md font-medium disabled:opacity-60"
      >
        {isCompleting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Finalizing...
          </>
        ) : (
          <>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Go to Dashboard
          </>
        )}
      </Button>
    </div>
  );
}
