"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Payment } from "@/data/types";

const CARD_PREVIEW_LIMIT = 4;

interface PaymentsCardProps {
  succeededPayments: Payment[];
  unpaidPayments: Payment[];
  getContactName: (id: string | undefined) => string;
  formatPaymentAmount: (amount: number) => string;
  getPaymentStatusBadge: (status: string) => React.ReactNode;
}

export default function PaymentsCard({
  succeededPayments,
  unpaidPayments,
  getContactName,
  formatPaymentAmount,
  getPaymentStatusBadge,
}: PaymentsCardProps) {
  const router = useRouter();
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [isUnpaidModalOpen, setIsUnpaidModalOpen] = useState(false);

  const successTotal = succeededPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const unpaidTotal = unpaidPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );

  const visiblePayments = succeededPayments.slice(0, CARD_PREVIEW_LIMIT);
  const extraPaymentCount = succeededPayments.length - CARD_PREVIEW_LIMIT;

  const visibleUnpaid = unpaidPayments.slice(0, CARD_PREVIEW_LIMIT);
  const extraUnpaidCount = unpaidPayments.length - CARD_PREVIEW_LIMIT;

  const handlePaymentClick = (payment: Payment) => {
    router.push(`/payments?paymentId=${payment.id}`);
  };

  const renderPaymentRow = (
    payment: Payment,
    amountColor: string,
    py = "py-2"
  ) => (
    <button
      key={payment.id}
      type="button"
      onClick={() => handlePaymentClick(payment)}
      className={`w-full flex items-center justify-between bg-muted rounded-lg px-4 ${py} gap-3 hover:bg-accent transition-colors text-left`}
    >
      <p className="text-sm font-medium text-foreground truncate flex-1">
        {getContactName(payment.contact_id)}
      </p>
      <span className={`text-sm font-semibold ${amountColor} flex-shrink-0`}>
        {formatPaymentAmount(payment.amount)}
      </span>
      <div className="flex-shrink-0">
        {getPaymentStatusBadge(payment.status)}
      </div>
    </button>
  );

  return (
    <>
      {/* Payments in Last 7 Days */}
      <Card className="bg-card border border-border shadow-sm min-h-48">
        <div className="p-6 pb-3 flex flex-col h-full">
          <p className="text-sm text-foreground font-bold tracking-wide mb-2">
            Payments in the Last 7 Days
          </p>
          <div className="border-b border-border mb-4" />
          <p className="text-4xl font-bold text-green-600 mb-4">
            $
            {successTotal.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </p>
          {succeededPayments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No payments in the last 7 days
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2.5">
              {visiblePayments.map((p) =>
                renderPaymentRow(p, "text-green-700")
              )}
              {extraPaymentCount > 0 && (
                <button
                  onClick={() => setIsPaymentsModalOpen(true)}
                  className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  +{extraPaymentCount} more
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Unpaid Payments */}
      <Card className="bg-card border border-border shadow-sm min-h-48">
        <div className="p-6 pb-3 flex flex-col h-full">
          <p className="text-sm text-foreground font-bold tracking-wide mb-2">
            Unpaid Payments
          </p>
          <div className="border-b border-border mb-4" />
          <p className="text-4xl font-bold text-foreground mb-4">
            {formatPaymentAmount(unpaidTotal)}
          </p>
          {unpaidPayments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No unpaid payments
              </p>
            </div>
          ) : (
            <div className="flex flex-col space-y-2.5">
              {visibleUnpaid.map((p) =>
                renderPaymentRow(p, "text-foreground")
              )}
              {extraUnpaidCount > 0 && (
                <button
                  onClick={() => setIsUnpaidModalOpen(true)}
                  className="text-center py-2 text-sm text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  +{extraUnpaidCount} more
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Payments Modal */}
      <Dialog
        open={isPaymentsModalOpen}
        onOpenChange={setIsPaymentsModalOpen}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Payments in the Last 7 Days ({succeededPayments.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
            {succeededPayments.map((p) =>
              renderPaymentRow(p, "text-green-700", "py-3")
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unpaid Modal */}
      <Dialog open={isUnpaidModalOpen} onOpenChange={setIsUnpaidModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Unpaid Payments ({unpaidPayments.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
            {unpaidPayments.map((p) =>
              renderPaymentRow(p, "text-foreground", "py-3")
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
