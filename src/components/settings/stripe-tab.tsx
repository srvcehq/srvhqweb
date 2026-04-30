"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CompanySetting } from "@/data/types";
import { db } from "@/data/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StripeTabProps {
  settings: CompanySetting;
  onSettingsChange?: (s: CompanySetting) => void;
}

export function StripeTab({ settings, onSettingsChange }: StripeTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const status = searchParams.get("stripe");
    if (status !== "connected" || !settings.stripe_connect_account_id) return;
    if (settings.stripe_connect_status === "active") {
      router.replace("/settings");
      return;
    }

    (async () => {
      const updated = await db.CompanySetting.update(settings.id, {
        stripe_connect_status: "active",
      });
      if (updated) {
        onSettingsChange?.(updated);
        toast.success("Stripe account connected.");
      }
      router.replace("/settings");
    })();
  }, [searchParams, settings, onSettingsChange, router]);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: settings.company_id,
          existingAccountId: settings.stripe_connect_account_id,
        }),
      });

      if (response.status === 429) {
        toast.error("Too many attempts. Please wait a moment and try again.");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || data.error || "Failed to start Stripe onboarding.");
        return;
      }

      if (data.accountId && data.accountId !== settings.stripe_connect_account_id) {
        const updated = await db.CompanySetting.update(settings.id, {
          stripe_connect_account_id: data.accountId,
          stripe_connect_status: "pending",
        });
        if (updated) onSettingsChange?.(updated);
      }

      window.location.href = data.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start Stripe onboarding.");
    } finally {
      setIsConnecting(false);
    }
  }

  const isActive = settings.stripe_connect_status === "active";
  const hasAccount = Boolean(settings.stripe_connect_account_id);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-card-header-from to-card-header-to border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            Stripe Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-semibold text-foreground">Connection Status</p>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? "Connected to Stripe"
                  : hasAccount
                  ? "Onboarding incomplete"
                  : "Not connected"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                isActive
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-400"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-400"
              }
            >
              {isActive ? "Active" : hasAccount ? "Pending" : "Not Connected"}
            </Badge>
          </div>

          {hasAccount && (
            <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800/40 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                Account ID:{" "}
                <code className="font-mono bg-green-100 dark:bg-green-900/30 px-1 py-0.5 rounded">
                  {settings.stripe_connect_account_id}
                </code>
              </p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-foreground mb-2">Payment Processing</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Stripe account to accept payments from clients via credit card or ACH bank transfer.
            </p>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              {isActive
                ? "Manage Connection"
                : hasAccount
                ? "Continue Onboarding"
                : "Connect Stripe Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
