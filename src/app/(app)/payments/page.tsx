"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/data/api";
import { findContactName } from "@/lib/contact-display";
import { useCompany } from "@/providers/company-provider";
import { toast } from "sonner";

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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  MoreVertical,
  Send,
  XCircle,
} from "lucide-react";
import type { Payment, Contact } from "@/data/types";
import { formatShortDate, formatCurrency, todayStr } from "@/lib/format-helpers";
import { queryKeys } from "@/lib/query-keys";
import { useSendCommunication } from "@/hooks/use-send-communication";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  succeeded: {
    label: "Succeeded",
    className:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40",
  },
  unpaid: {
    label: "Unpaid",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40",
  },
  processing: {
    label: "Processing",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40",
  },
  failed: {
    label: "Failed",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40",
  },
  partially_refunded: {
    label: "Partial Refund",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/40",
  },
  refunded: {
    label: "Refunded",
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/40",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/40",
  },
};

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  final: "Final Payment",
  invoice: "Invoice",
  maintenance: "Maintenance",
};

const MANUAL_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "other", label: "Other" },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PaymentsPage() {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // Communications
  const {
    sendInvoice,
    resendPayLink,
    isSending,
  } = useSendCommunication();

  // Modals
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
  const [markPaidPayment, setMarkPaidPayment] = useState<Payment | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState("cash");
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceContactId, setInvoiceContactId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceTitle, setInvoiceTitle] = useState("");

  // Data
  const { data: payments = [], isLoading } = useQuery({
    queryKey: queryKeys.payments(currentCompanyId),
    queryFn: () =>
      db.Payment.filter({ company_id: currentCompanyId }, "-created_date"),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: queryKeys.contacts(currentCompanyId),
    queryFn: () => db.Contact.filter({ company_id: currentCompanyId }),
  });

  const { data: bids = [] } = useQuery({
    queryKey: queryKeys.bids(currentCompanyId),
    queryFn: () => db.Bid.filter({ company_id: currentCompanyId }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects(currentCompanyId),
    queryFn: () => db.Project.filter({ company_id: currentCompanyId }),
  });

  const { data: maintenancePlans = [] } = useQuery({
    queryKey: queryKeys.maintenancePlans(currentCompanyId),
    queryFn: () =>
      db.MaintenancePlan.filter({ company_id: currentCompanyId }),
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: (data: { paymentId: string; method: string }) =>
      db.Payment.update(data.paymentId, {
        status: "succeeded",
        payment_method: data.method,
        paid_date: todayStr(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(currentCompanyId) });
      toast.success("Payment marked as paid.");
      setMarkPaidPayment(null);
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (paymentId: string) =>
      db.Payment.update(paymentId, { status: "cancelled" as Payment["status"] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(currentCompanyId) });
      toast.success("Payment cancelled.");
      setDetailPayment(null);
    },
  });

  const getContactName = (contactId: string) =>
    findContactName(contacts, contactId);

  const getContact = (contactId: string): Contact | undefined =>
    contacts.find((c) => c.id === contactId);

  // Linked record helpers
  const getLinkedRecordName = (payment: Payment): string | null => {
    if (payment.bid_id) {
      const bid = bids.find((b) => b.id === payment.bid_id);
      return bid ? `Bid: ${bid.title || `#${bid.id}`}` : `Bid #${payment.bid_id}`;
    }
    if (payment.project_id) {
      const project = projects.find((p) => p.id === payment.project_id);
      return project ? `Project: ${project.title || `#${project.id}`}` : `Project #${payment.project_id}`;
    }
    if (payment.maintenance_plan_id) {
      const plan = maintenancePlans.find(
        (p) => p.id === payment.maintenance_plan_id
      );
      return plan
        ? `Plan: ${plan.title || `#${plan.id}`}`
        : `Plan #${payment.maintenance_plan_id}`;
    }
    return null;
  };

  // Stats
  const today = todayStr();

  const collectedToday = useMemo(
    () =>
      payments
        .filter((p) => p.status === "succeeded" && p.paid_date === today)
        .reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments, today]
  );

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

  const activeClients = useMemo(() => {
    const uniqueIds = [
      ...new Set(payments.map((p) => p.contact_id).filter(Boolean)),
    ];
    return uniqueIds
      .map((id) => contacts.find((c) => c.id === id))
      .filter(Boolean)
      .sort((a, b) =>
        `${a!.first_name} ${a!.last_name}`.localeCompare(
          `${b!.first_name} ${b!.last_name}`
        )
      );
  }, [payments, contacts]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (clientFilter !== "all" && p.contact_id !== clientFilter) return false;
      return true;
    });
  }, [payments, statusFilter, typeFilter, clientFilter]);

  // Actions
  const handleCopyPayLink = (payment: Payment) => {
    const link = `https://pay.terraflow.com/p/${payment.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Pay link copied to clipboard.");
  };

  const handleResendPayLink = (payment: Payment) => {
    const contact = getContact(payment.contact_id);
    if (!contact) {
      toast.error("Contact not found.");
      return;
    }
    resendPayLink(contact, payment.amount, payment.id);
  };

  const handleSendInvoice = async () => {
    const contact = contacts.find((c) => c.id === invoiceContactId);
    if (!contact || !invoiceAmount) {
      toast.error("Select a client and enter an amount.");
      return;
    }
    const amount = parseFloat(invoiceAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    // Create the payment record
    const payment = await db.Payment.create({
      company_id: currentCompanyId,
      contact_id: invoiceContactId,
      type: "invoice",
      amount,
      status: "unpaid",
      description: invoiceTitle || "Invoice",
      due_date: todayStr(),
    });

    // Send the communication
    await sendInvoice(contact, amount, payment.id, invoiceTitle || "Invoice");

    queryClient.invalidateQueries({ queryKey: queryKeys.payments(currentCompanyId) });
    setShowInvoiceDialog(false);
    setInvoiceContactId("");
    setInvoiceAmount("");
    setInvoiceTitle("");
  };

  return (
    <div className="p-4 md:p-8">
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
          <Card className="shadow-lg">
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
          <Card className="shadow-lg">
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
          <Card className="shadow-lg">
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
          <Card className="shadow-lg">
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
            <CardTitle className="flex items-center gap-2">
              Transactions
              <Badge variant="secondary">{filteredPayments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4" />
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
                        Due
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase w-16">
                        {/* Actions */}
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
                          className="hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => setDetailPayment(payment)}
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
                            <Badge variant="secondary" className="text-xs">
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
                          <td
                            className="px-6 py-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                                <DropdownMenuItem
                                  onClick={() => setDetailPayment(payment)}
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCopyPayLink(payment)}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Pay Link
                                </DropdownMenuItem>
                                {(payment.status === "unpaid" ||
                                  payment.status === "failed") && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setMarkPaidPayment(payment);
                                        setMarkPaidMethod("cash");
                                      }}
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleResendPayLink(payment)
                                      }
                                    >
                                      <Send className="w-4 h-4 mr-2" />
                                      Resend Pay Link
                                    </DropdownMenuItem>
                                  </>
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
      </div>

      {/* ============ Payment Detail Modal ============ */}
      <Dialog
        open={!!detailPayment}
        onOpenChange={(open) => !open && setDetailPayment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {detailPayment && (() => {
            const statusCfg =
              STATUS_CONFIG[detailPayment.status] || STATUS_CONFIG.unpaid;
            const linkedRecord = getLinkedRecordName(detailPayment);
            const contact = getContact(detailPayment.contact_id);

            return (
              <div className="space-y-5 mt-2">
                {/* Amount + Status */}
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(detailPayment.amount)}
                  </p>
                  <Badge variant="outline" className={statusCfg.className}>
                    {statusCfg.label}
                  </Badge>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                      Client
                    </p>
                    <p className="font-medium">
                      {contact
                        ? `${contact.first_name} ${contact.last_name}`
                        : "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                      Type
                    </p>
                    <p className="font-medium">
                      {TYPE_LABELS[detailPayment.type] || detailPayment.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                      Method
                    </p>
                    <p className="font-medium capitalize">
                      {detailPayment.payment_method || "\u2014"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                      Due Date
                    </p>
                    <p className="font-medium">
                      {formatShortDate(detailPayment.due_date)}
                    </p>
                  </div>
                  {detailPayment.paid_date && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                        Paid Date
                      </p>
                      <p className="font-medium">
                        {formatShortDate(detailPayment.paid_date)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">
                      Created
                    </p>
                    <p className="font-medium">
                      {formatShortDate(detailPayment.created_date)}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {detailPayment.description && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm bg-muted rounded-lg p-3">
                      {detailPayment.description}
                    </p>
                  </div>
                )}

                {/* Linked Record */}
                {linkedRecord && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                      Linked To
                    </p>
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-3 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium">{linkedRecord}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyPayLink(detailPayment)}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    Copy Pay Link
                  </Button>

                  {(detailPayment.status === "unpaid" ||
                    detailPayment.status === "failed") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendPayLink(detailPayment)}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Resend Pay Link
                      </Button>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-emerald-600"
                        onClick={() => {
                          setDetailPayment(null);
                          setMarkPaidPayment(detailPayment);
                          setMarkPaidMethod("cash");
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Mark as Paid
                      </Button>
                    </>
                  )}

                  {detailPayment.status === "unpaid" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 ml-auto"
                      onClick={() => cancelMutation.mutate(detailPayment.id)}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ============ Mark as Paid Dialog ============ */}
      <Dialog
        open={!!markPaidPayment}
        onOpenChange={(open) => !open && setMarkPaidPayment(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Mark as Paid
            </DialogTitle>
          </DialogHeader>
          {markPaidPayment && (
            <div className="space-y-4 mt-2">
              <div className="text-center py-2">
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(markPaidPayment.amount)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getContactName(markPaidPayment.contact_id)}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={markPaidMethod}
                  onValueChange={setMarkPaidMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setMarkPaidPayment(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                  disabled={markPaidMutation.isPending}
                  onClick={() =>
                    markPaidMutation.mutate({
                      paymentId: markPaidPayment.id,
                      method: markPaidMethod,
                    })
                  }
                >
                  {markPaidMutation.isPending
                    ? "Saving..."
                    : "Confirm Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={invoiceContactId} onValueChange={setInvoiceContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Invoice Title</Label>
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="e.g. Lawn mowing — April"
                value={invoiceTitle}
                onChange={(e) => setInvoiceTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="0.00"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowInvoiceDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isSending || !invoiceContactId || !invoiceAmount}
              onClick={handleSendInvoice}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Invoice"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
