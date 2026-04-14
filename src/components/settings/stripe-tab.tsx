"use client";

import { CompanySetting } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard } from "lucide-react";

interface StripeTabProps {
  settings: CompanySetting;
}

export function StripeTab({ settings }: StripeTabProps) {
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
                {settings.stripe_connect_account_id
                  ? "Connected to Stripe"
                  : "Not connected"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                settings.stripe_connect_status === "active"
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:border-green-800/40 dark:text-green-400"
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-400"
              }
            >
              {settings.stripe_connect_status === "active"
                ? "Active"
                : "Not Connected"}
            </Badge>
          </div>

          {settings.stripe_connect_account_id && (
            <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800/40 rounded-lg">
              <p className="text-sm text-green-700">
                Account ID:{" "}
                <code className="font-mono bg-green-100 px-1 py-0.5 rounded">
                  {settings.stripe_connect_account_id}
                </code>
              </p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-semibold text-foreground mb-2">
              Payment Processing
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Stripe account to accept payments from clients via
              credit card or ACH bank transfer.
            </p>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => {
                alert("This would redirect to Stripe Connect OAuth flow");
              }}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {settings.stripe_connect_account_id
                ? "Manage Connection"
                : "Connect Stripe Account"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
