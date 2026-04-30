import { db } from "@/data/api";
import type { Communication, Contact, CompanySetting } from "@/data/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CommunicationAction =
  | "send_invoice"
  | "send_estimate"
  | "send_deposit_scheduled"
  | "send_deposit_approved"
  | "send_final_payment"
  | "send_login_link"
  | "send_service_pay_link"
  | "send_card_charged"
  | "resend_pay_link"
  | "resend_deposit_link"
  | "resend_estimate";

export type SendMethod = "sms" | "email" | "both";

export interface SendCommunicationParams {
  action: CommunicationAction;
  contact: Contact;
  companyName: string;
  companyId: string;
  method: SendMethod;
  /** dollar amount (number) */
  amount?: number;
  /** deposit dollar amount */
  depositAmount?: number;
  /** project/bid/invoice title */
  title?: string;
  /** linked entity id (bid, project, payment, etc.) */
  relatedId?: string;
  /** linked entity type */
  relatedType?: Communication["related_type"];
  /** override pay link with a real Stripe Checkout URL */
  payUrl?: string;
}

interface TemplateResult {
  sms: string;
  emailSubject: string;
  emailBody: string;
  channel: Communication["channel"];
}

/* ------------------------------------------------------------------ */
/* Link generators                                                     */
/* ------------------------------------------------------------------ */

function paymentLink(relatedId?: string, override?: string): string {
  if (override) return override;
  return `https://pay.terraflow.com/p/${relatedId || "unknown"}`;
}

function bidLink(relatedId?: string): string {
  return `https://app.terraflow.com/bid/${relatedId || "unknown"}`;
}

function loginLink(contactId: string): string {
  return `https://app.terraflow.com/portal/${contactId}`;
}

/* ------------------------------------------------------------------ */
/* Currency formatter                                                  */
/* ------------------------------------------------------------------ */

function fmtMoney(amount?: number): string {
  if (amount == null) return "$0";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

function buildTemplate(params: SendCommunicationParams): TemplateResult {
  const {
    action,
    contact,
    companyName,
    amount,
    depositAmount,
    title,
    relatedId,
    payUrl,
  } = params;
  const link = (id?: string) => paymentLink(id, payUrl);

  const customerName = `${contact.first_name} ${contact.last_name}`.trim() || "there";
  const amt = fmtMoney(amount);
  const dep = fmtMoney(depositAmount);
  const projectName = title || "your project";

  switch (action) {
    /* ---- Payments: Send Invoice ---- */
    case "send_invoice":
      return {
        sms: `${companyName}: Your invoice for ${amt} is ready. Pay here: ${link(relatedId)}`,
        emailSubject: "Your Invoice is Ready",
        emailBody: `Hi ${customerName},\n\nYour invoice for ${title || "services rendered"} is ready.\n\nAmount due: ${amt}\n\nYou can pay securely here:\n${link(relatedId)}\n\nThanks,\n${companyName}`,
        channel: "invoice",
      };

    /* ---- Bids / Live Estimating: Send Estimate ---- */
    case "send_estimate":
      return {
        sms: `${companyName}: Your estimate for ${amt} is ready. View it here: ${bidLink(relatedId)}`,
        emailSubject: "Your Estimate is Ready",
        emailBody: `Hi ${customerName},\n\nYour estimate for ${projectName} is ready.\n\nTotal: ${amt}\nDeposit due: ${dep}\n\nView your estimate here:\n${bidLink(relatedId)}\n\nThanks,\n${companyName}`,
        channel: "estimate",
      };

    /* ---- Projects: Schedule & Send Deposit ---- */
    case "send_deposit_scheduled":
      return {
        sms: `${companyName}: Your project is scheduled. A deposit of ${dep} is due to secure your spot. Pay here: ${link(relatedId)}`,
        emailSubject: "Project Scheduled \u2013 Deposit Required",
        emailBody: `Hi ${customerName},\n\nYour project has been scheduled.\n\nDeposit due: ${dep}\n\nPlease complete your deposit here:\n${link(relatedId)}\n\nWe look forward to getting started.\n\nThanks,\n${companyName}`,
        channel: "payment_link",
      };

    /* ---- Projects: Accept (no date) & Send Deposit ---- */
    case "send_deposit_approved":
      return {
        sms: `${companyName}: Your project has been approved. A deposit of ${dep} is required to get started. Pay here: ${link(relatedId)}`,
        emailSubject: "Project Approved \u2013 Deposit Required",
        emailBody: `Hi ${customerName},\n\nYour project has been approved.\n\nDeposit due: ${dep}\n\nPlease complete your deposit here:\n${link(relatedId)}\n\nWe'll schedule your project once the deposit is received.\n\nThanks,\n${companyName}`,
        channel: "payment_link",
      };

    /* ---- Projects: Complete & Send Final Pay ---- */
    case "send_final_payment":
      return {
        sms: `${companyName}: Your project is complete. Your final balance of ${amt} is ready. Pay here: ${link(relatedId)}`,
        emailSubject: "Project Complete \u2013 Final Payment Due",
        emailBody: `Hi ${customerName},\n\nYour project has been completed.\n\nFinal balance due: ${amt}\n\nYou can complete your payment here:\n${link(relatedId)}\n\nThank you for your business.\n\nThanks,\n${companyName}`,
        channel: "payment_link",
      };

    /* ---- Contacts: Send Login Link ---- */
    case "send_login_link":
      return {
        sms: `${companyName}: Access your client portal here: ${loginLink(contact.id)}`,
        emailSubject: "Access Your Client Portal",
        emailBody: `Hi ${customerName},\n\nYou can access your client portal using the link below:\n\n${loginLink(contact.id)}\n\nThis will let you view your projects, payments, and job history.\n\nThanks,\n${companyName}`,
        channel: "system",
      };

    /* ---- Schedule: Service Complete — Send Pay Link ---- */
    case "send_service_pay_link":
      return {
        sms: `${companyName}: Your service is complete. Your balance of ${amt} is ready. Pay here: ${link(relatedId)}`,
        emailSubject: "Service Complete \u2013 Payment Due",
        emailBody: `Hi ${customerName},\n\nYour service has been completed.\n\nAmount due: ${amt}\n\nYou can complete your payment here:\n${link(relatedId)}\n\nThanks,\n${companyName}`,
        channel: "payment_link",
      };

    /* ---- Schedule: Charge Card Confirmation ---- */
    case "send_card_charged":
      return {
        sms: `${companyName}: Your service is complete. Your card has been charged ${amt}. View details here: ${loginLink(contact.id)}`,
        emailSubject: "Service Complete \u2013 Payment Received",
        emailBody: `Hi ${customerName},\n\nYour service has been completed and your card has been successfully charged.\n\nAmount paid: ${amt}\n\nYou can view your payment and history here:\n${loginLink(contact.id)}\n\nThanks,\n${companyName}`,
        channel: "payment_link",
      };

    /* ---- Resend variants ---- */
    case "resend_pay_link":
      return {
        sms: `${companyName}: Reminder — your balance of ${amt} is ready. Pay here: ${link(relatedId)}`,
        emailSubject: "Payment Reminder",
        emailBody: `Hi ${customerName},\n\nThis is a reminder that you have an outstanding balance.\n\nAmount due: ${amt}\n\nYou can pay here:\n${link(relatedId)}\n\nThanks,\n${companyName}`,
        channel: "payment_link",
      };

    case "resend_deposit_link":
      return {
        sms: `${companyName}: Reminder — a deposit of ${dep} is required. Pay here: ${link(relatedId)}`,
        emailSubject: "Deposit Reminder",
        emailBody: `Hi ${customerName},\n\nThis is a reminder that a deposit is required for your project.\n\nDeposit due: ${dep}\n\nPlease complete your deposit here:\n${link(relatedId)}\n\nThanks,\n${companyName}`,
        channel: "payment_link",
      };

    case "resend_estimate":
      return {
        sms: `${companyName}: Your estimate for ${amt} is still available. View it here: ${bidLink(relatedId)}`,
        emailSubject: "Your Estimate \u2013 Follow Up",
        emailBody: `Hi ${customerName},\n\nJust following up \u2014 your estimate for ${projectName} is still available.\n\nTotal: ${amt}\n\nView it here:\n${bidLink(relatedId)}\n\nThanks,\n${companyName}`,
        channel: "estimate",
      };

    default:
      return {
        sms: `${companyName}: You have a new notification. Log in to view: ${loginLink(contact.id)}`,
        emailSubject: "New Notification",
        emailBody: `Hi ${customerName},\n\nYou have a new notification. Please log in to view it.\n\n${loginLink(contact.id)}\n\nThanks,\n${companyName}`,
        channel: "system",
      };
  }
}

/* ------------------------------------------------------------------ */
/* Send communication                                                  */
/* ------------------------------------------------------------------ */

export interface SendResult {
  smsCommunication?: Communication;
  emailCommunication?: Communication;
  method: SendMethod;
}

/**
 * Creates Communication records for the given action.
 * When real providers are wired up, this function will also
 * call /api/communications/send to deliver via Twilio/email.
 */
export async function sendCommunication(
  params: SendCommunicationParams
): Promise<SendResult> {
  const template = buildTemplate(params);
  const { contact, companyId, method } = params;

  const result: SendResult = { method };

  // Determine which channels to send
  const sendSms = (method === "sms" || method === "both") && !!contact.phone;
  const sendEmail = (method === "email" || method === "both") && !!contact.email;

  // Fallback: if requested method isn't available, try the other
  const actualSendSms = sendSms || (!sendEmail && !!contact.phone);
  const actualSendEmail = sendEmail || (!sendSms && !!contact.email);

  if (actualSendSms) {
    result.smsCommunication = await db.Communication.create({
      company_id: companyId,
      contact_id: contact.id,
      type: "sms",
      direction: "outbound",
      channel: template.channel,
      body: template.sms,
      sent_at: new Date().toISOString(),
      status: "sent",
      related_type: params.relatedType,
      related_id: params.relatedId,
    });
  }

  if (actualSendEmail) {
    result.emailCommunication = await db.Communication.create({
      company_id: companyId,
      contact_id: contact.id,
      type: "email",
      direction: "outbound",
      channel: template.channel,
      subject: template.emailSubject,
      body: template.emailBody,
      sent_at: new Date().toISOString(),
      status: "sent",
      related_type: params.relatedType,
      related_id: params.relatedId,
    });
  }

  // TODO: Call /api/communications/send for real delivery
  // await fetch("/api/communications/send", {
  //   method: "POST",
  //   body: JSON.stringify({
  //     sms: actualSendSms ? { to: contact.phone, body: template.sms } : null,
  //     email: actualSendEmail ? { to: contact.email, subject: template.emailSubject, body: template.emailBody } : null,
  //   }),
  // });

  return result;
}

/* ------------------------------------------------------------------ */
/* Helper: auto-detect best send method                                */
/* ------------------------------------------------------------------ */

export function detectSendMethod(contact: Contact): SendMethod {
  if (contact.phone && contact.email) return "both";
  if (contact.phone) return "sms";
  if (contact.email) return "email";
  return "sms"; // fallback
}

/* ------------------------------------------------------------------ */
/* Helper: describe what was sent (for toasts)                         */
/* ------------------------------------------------------------------ */

export function describeSendResult(result: SendResult): string {
  const parts: string[] = [];
  if (result.smsCommunication) parts.push("SMS");
  if (result.emailCommunication) parts.push("email");
  if (parts.length === 0) return "No contact info available to send.";
  return `Sent via ${parts.join(" & ")}`;
}
