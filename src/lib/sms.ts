import "server-only";
import twilio, { Twilio } from "twilio";
import { getServerEnv } from "./env";

let _client: Twilio | null = null;

function client(): Twilio | null {
  if (_client) return _client;
  const env = getServerEnv();
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
  _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return _client;
}

export interface SendSmsParams {
  to: string;
  body: string;
  statusCallback?: string;
}

export interface SendSmsResult {
  delivered: boolean;
  messageSid?: string;
  skipped?: "no_provider" | "no_from_number" | "invalid_to";
  error?: string;
}

function normalizeE164(phone: string): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function sendSms(params: SendSmsParams): Promise<SendSmsResult> {
  const env = getServerEnv();
  const c = client();
  const from = env.TWILIO_FROM_NUMBER;

  if (!c) {
    console.log("[sms] (no provider — would send) →", params.to, "|", params.body);
    return { delivered: false, skipped: "no_provider" };
  }
  if (!from) {
    console.error("[sms] TWILIO_FROM_NUMBER not set — refusing to send");
    return { delivered: false, skipped: "no_from_number" };
  }

  const to = normalizeE164(params.to);
  if (!to) {
    console.error("[sms] invalid recipient phone:", params.to);
    return { delivered: false, skipped: "invalid_to" };
  }

  try {
    const message = await c.messages.create({
      from,
      to,
      body: params.body,
      statusCallback: params.statusCallback,
    });
    return { delivered: true, messageSid: message.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sms] send failed:", message);
    return { delivered: false, error: message };
  }
}
