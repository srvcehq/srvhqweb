"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/data/api";
import { useCompany } from "@/providers/company-provider";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  MoreVertical,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Status / type config                                                */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  succeeded: {
    label: "Succeeded",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40",
  },
  partially_refunded: {
    label: "Partial Refund",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/40",
  },
  refunded: {
    label: "Refunded",
    className: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/40",
  },
};

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  final: "Final Payment",
  invoice: "Invoice",
  maintenance: "Maintenance",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "\u2014";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function PaymentsPage() {
  const { currentCompanyId } = useCompany();

  // State
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState<string | null>(null);

  // Data fetching
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments-ledger", currentCompanyId],
    queryFn: () =>
      db.Payment.filter({ company_id: currentCompanyId }, "-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-pay", currentCompanyId],
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  // Helpers
  const getContactName = (contactId: string) => {
    if (!contactId) return "\u2014";
    const c = contacts.find((x) => x.id === contactId);
    return c ? `${c.first_name} ${c.last_name}` : "Deleted Contact";
  };

  // Stats
  const collectedToday = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return payments
      .filter((p) => p.status === "succeeded" && p.paid_date === todayStr)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const unpaidStats = useMemo(() => {
    const unpaid = payments.filter((p) => p.status === "unpaid");
    return {
      count: unpaid.length,
      total: unpaid.reduce((sum, p) => sum + (p.amount || 0), 0),
    };
  }, [payments]);

  const processingStats = useMemo(() => {
    const processing = payments.filter((p) => p.status === "processing");
    return {
      count: processing.length,
      total: processing.reduce((sum, p) => sum + (p.amount || 0), 0),
    };
  }, [payments]);

  const failedStats = useMemo(() => {
    const failed = payments.filter((p) => p.status === "failed");
    return {
      count: failed.length,
      total: failed.reduce((sum, p) => sum + (p.amount || 0), 0),
    };
  }, [payments]);

  // Active clients for filter
  const activeClients = useMemo(() => {
    const uniqueIds = [...new Set(payments.map((p) => p.contact_id).filter(Boolean))];
    return uniqueIds
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean)
      .sort((a, b) =>
        `${a!.first_name} ${a!.last_name}`.localeCompare(
          `${b!.first_name} ${b!.last_name}`
        )
      );
  }, [payments, contacts]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (clientFilter !== "all" && p.contact_id !== clientFilter) return false;
      return true;
    });
  }, [payments, statusFilter, typeFilter, clientFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-background dark:via-background dark:to-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Payments
              </h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">
              Track all payment activity and transactions
            </p>
          </div>
          <Button
            onClick={() => setShowInvoiceDialog(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            Send Invoice
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Collected Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(collectedToday)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Unpaid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">
                {unpaidStats.count}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(unpaidStats.total)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {processingStats.count}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(processingStats.total)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {failedStats.count}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(failedStats.total)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-muted to-muted border-b border-border">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="succeeded">Succeeded</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="final">Final Payment</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {activeClients.map((client) => (
                      <SelectItem key={client!.id} value={client!.id}>
                        {client!.first_name} {client!.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="shadow-lg">
          <CardHeader className="border-b border-border bg-gradient-to-r from-card-header-from to-card-header-to">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Transactions
                <Badge variant="secondary">{filteredPayments.length}</Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No payments found</p>
                <p className="text-sm mt-1">
                  Adjust your filters or send an invoice to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                        Paid Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">
                        Method
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.map((payment) => {
                      const statusCfg =
                        STATUS_CONFIG[payment.status] || STATUS_CONFIG.unpaid;
                      return (
                        <tr
                          key={payment.id}
                          className="hover:bg-accent transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground max-w-[250px] truncate">
                              {payment.description || "\u2014"}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {getContactName(payment.contact_id)}
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <Badge
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {TYPE_LABELS[payment.type] || payment.type}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 hidden md:table-cell">
                            <Badge
                              variant="outline"
                              className={statusCfg.className}
                            >
                              {statusCfg.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                            {formatShortDate(payment.due_date)}
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                            {payment.paid_date
                              ? formatShortDate(payment.paid_date)
                              : "\u2014"}
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground uppercase">
                            {payment.payment_method || "\u2014"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`font-semibold ${
                                payment.status === "succeeded"
                                  ? "text-green-700"
                                  : payment.status === "failed"
                                    ? "text-red-600"
                                    : "text-foreground"
                              }`}
                            >
                              {formatCurrency(payment.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {(payment.status === "unpaid" ||
                                  payment.status === "failed") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setShowMarkPaidDialog(payment.id)
                                    }
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {payment.status === "unpaid" && (
                                  <DropdownMenuItem>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Send Invoice Dialog (stub) */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send Invoice</DialogTitle>
              <DialogDescription>
                Create and send an invoice to a client via email with a payment
                link.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 p-4 text-sm text-amber-800 dark:text-amber-400">
                Invoice sending requires Stripe Connect integration. Configure
                your Stripe account in Settings to enable this feature.
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInvoiceDialog(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark as Paid Dialog (stub) */}
        <Dialog
          open={!!showMarkPaidDialog}
          onOpenChange={() => setShowMarkPaidDialog(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Mark as Paid</DialogTitle>
              <DialogDescription>
                This will mark the payment as succeeded with today&apos;s date.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800/40 p-4 text-sm text-green-800 dark:text-green-400">
                In production, this action updates the payment record and
                notifies the client. The mock data layer will simulate this
                behavior.
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowMarkPaidDialog(null)}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setShowMarkPaidDialog(null)}
              >
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
