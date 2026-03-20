"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-foreground">
          <XCircle className="w-8 h-8" />
          Payment Canceled
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground text-center">
          Your payment was not completed. No charges were made. You can close
          this tab.
        </p>
      </CardContent>
    </Card>
  );
}
