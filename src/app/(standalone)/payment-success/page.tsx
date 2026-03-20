"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
  return (
    <Card className="w-full max-w-[560px] shadow-2xl">
      <CardHeader className="px-12 pt-12 pb-6">
        <CardTitle className="flex items-center justify-center gap-4 text-green-600 text-3xl font-bold">
          <CheckCircle className="w-12 h-12" />
          Payment Successful
        </CardTitle>
      </CardHeader>
      <CardContent className="px-12 pb-12">
        <p className="text-foreground text-center text-lg">
          Your payment has been processed successfully. You can close this tab.
        </p>
      </CardContent>
    </Card>
  );
}
