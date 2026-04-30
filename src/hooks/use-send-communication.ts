import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useCompany } from "@/providers/company-provider";
import { db } from "@/data/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import {
  sendCommunication,
  detectSendMethod,
  describeSendResult,
  type CommunicationAction,
  type SendMethod,
  type SendCommunicationParams,
} from "@/lib/communications";
import type { Contact, Communication } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useSendCommunication() {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: companySettings = [] } = useQuery({
    queryKey: ["company-settings", currentCompanyId],
    queryFn: () => db.CompanySetting.filter({ company_id: currentCompanyId }),
    staleTime: 10 * 60 * 1000,
  });

  const companyName =
    companySettings[0]?.company_name || "Your Service Company";

  const mutation = useMutation({
    mutationFn: (params: SendCommunicationParams) =>
      sendCommunication(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communications(currentCompanyId),
      });
      toast.success(describeSendResult(result));
    },
    onError: () => {
      toast.error("Failed to send communication.");
    },
  });

  /** Build shared params, then send. Returns the mutation promise. */
  function send(
    action: CommunicationAction,
    contact: Contact,
    opts: {
      amount?: number;
      depositAmount?: number;
      title?: string;
      relatedId?: string;
      relatedType?: Communication["related_type"];
      method?: SendMethod;
      payUrl?: string;
    } = {}
  ) {
    const method = opts.method ?? detectSendMethod(contact);
    return mutation.mutateAsync({
      action,
      contact,
      companyName,
      companyId: currentCompanyId,
      method,
      amount: opts.amount,
      depositAmount: opts.depositAmount,
      title: opts.title,
      relatedId: opts.relatedId,
      relatedType: opts.relatedType,
      payUrl: opts.payUrl,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Convenience methods for each action                               */
  /* ---------------------------------------------------------------- */

  /** Payments page: Send Invoice */
  function sendInvoice(
    contact: Contact,
    amount: number,
    paymentId: string,
    invoiceTitle?: string,
    payUrl?: string
  ) {
    return send("send_invoice", contact, {
      amount,
      title: invoiceTitle,
      relatedId: paymentId,
      relatedType: "invoice",
      payUrl,
    });
  }

  /** Bids / Live Estimating: Send Estimate to Client */
  function sendEstimate(
    contact: Contact,
    bidTotal: number,
    depositAmount: number,
    bidId: string,
    projectName?: string
  ) {
    return send("send_estimate", contact, {
      amount: bidTotal,
      depositAmount,
      title: projectName,
      relatedId: bidId,
      relatedType: "bid",
    });
  }

  /** Projects: Schedule & Send Deposit Link */
  function sendDepositScheduled(
    contact: Contact,
    depositAmount: number,
    paymentId: string
  ) {
    return send("send_deposit_scheduled", contact, {
      depositAmount,
      relatedId: paymentId,
      relatedType: "project",
    });
  }

  /** Projects: Accept (no date) & Send Deposit Link */
  function sendDepositApproved(
    contact: Contact,
    depositAmount: number,
    paymentId: string
  ) {
    return send("send_deposit_approved", contact, {
      depositAmount,
      relatedId: paymentId,
      relatedType: "project",
    });
  }

  /** Projects: Complete & Send Final Pay Link */
  function sendFinalPayment(
    contact: Contact,
    amount: number,
    paymentId: string
  ) {
    return send("send_final_payment", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "project",
    });
  }

  /** Contacts: Send Client Login Link */
  function sendLoginLink(contact: Contact) {
    return send("send_login_link", contact, {
      relatedType: "general",
    });
  }

  /** Schedule: Service Complete — Send Pay Link */
  function sendServicePayLink(
    contact: Contact,
    amount: number,
    paymentId: string
  ) {
    return send("send_service_pay_link", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "visit",
    });
  }

  /** Schedule: Charge Card Confirmation */
  function sendCardCharged(contact: Contact, amount: number) {
    return send("send_card_charged", contact, {
      amount,
      relatedType: "visit",
    });
  }

  /** Resend: Pay Link (for any unpaid payment) */
  function resendPayLink(
    contact: Contact,
    amount: number,
    paymentId: string,
    payUrl?: string
  ) {
    return send("resend_pay_link", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "invoice",
      payUrl,
    });
  }

  /** Resend: Deposit Link */
  function resendDepositLink(
    contact: Contact,
    depositAmount: number,
    paymentId: string
  ) {
    return send("resend_deposit_link", contact, {
      depositAmount,
      relatedId: paymentId,
      relatedType: "project",
    });
  }

  /** Resend: Estimate */
  function resendEstimate(
    contact: Contact,
    bidTotal: number,
    depositAmount: number,
    bidId: string,
    projectName?: string
  ) {
    return send("resend_estimate", contact, {
      amount: bidTotal,
      depositAmount,
      title: projectName,
      relatedId: bidId,
      relatedType: "bid",
    });
  }

  /** Resend: Final Payment */
  function resendFinalPayment(
    contact: Contact,
    amount: number,
    paymentId: string,
    payUrl?: string
  ) {
    return send("resend_final_payment", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "project",
      payUrl,
    });
  }

  /** Contacts: Send Invite Link (new client) */
  function sendInviteLink(contact: Contact) {
    return send("send_invite_link", contact, {
      relatedType: "general",
    });
  }

  /** Contacts: Resend Invite Link */
  function resendInviteLink(contact: Contact) {
    return send("resend_invite_link", contact, {
      relatedType: "general",
    });
  }

  /** Reminders */
  function sendPaymentReminder(
    contact: Contact,
    amount: number,
    paymentId: string,
    payUrl?: string
  ) {
    return send("payment_reminder", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "invoice",
      payUrl,
    });
  }

  function sendDepositReminder(
    contact: Contact,
    depositAmount: number,
    paymentId: string,
    payUrl?: string
  ) {
    return send("deposit_reminder", contact, {
      depositAmount,
      relatedId: paymentId,
      relatedType: "project",
      payUrl,
    });
  }

  function sendFinalPaymentReminder(
    contact: Contact,
    amount: number,
    paymentId: string,
    payUrl?: string
  ) {
    return send("final_payment_reminder", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "project",
      payUrl,
    });
  }

  /** System events (typically fired by webhooks, but also exposed for manual ops) */
  function sendPaymentFailed(
    contact: Contact,
    amount: number,
    paymentId: string,
    payUrl?: string
  ) {
    return send("payment_failed", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "invoice",
      payUrl,
    });
  }

  function sendChargeRefunded(
    contact: Contact,
    amount: number,
    paymentId: string
  ) {
    return send("charge_refunded", contact, {
      amount,
      relatedId: paymentId,
      relatedType: "invoice",
    });
  }

  return {
    send,
    sendInvoice,
    sendEstimate,
    sendDepositScheduled,
    sendDepositApproved,
    sendFinalPayment,
    sendLoginLink,
    sendServicePayLink,
    sendCardCharged,
    resendPayLink,
    resendDepositLink,
    resendEstimate,
    resendFinalPayment,
    sendInviteLink,
    resendInviteLink,
    sendPaymentReminder,
    sendDepositReminder,
    sendFinalPaymentReminder,
    sendPaymentFailed,
    sendChargeRefunded,
    isSending: mutation.isPending,
  };
}
