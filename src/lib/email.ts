import "server-only";
import { ServerClient } from "postmark";
import { getServerEnv } from "./env";

let _client: ServerClient | null = null;

function client(): ServerClient | null {
  if (_client) return _client;
  const env = getServerEnv();
  if (!env.POSTMARK_SERVER_TOKEN) return null;
  _client = new ServerClient(env.POSTMARK_SERVER_TOKEN);
  return _client;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  replyTo?: string;
  tag?: string;
  metadata?: Record<string, string>;
}

export interface SendEmailResult {
  delivered: boolean;
  messageId?: string;
  skipped?: "no_provider" | "no_from_address";
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const env = getServerEnv();
  const c = client();
  const from = env.POSTMARK_FROM_EMAIL;

  if (!c) {
    console.log("[email] (no provider — would send) →", params.to, "|", params.subject);
    return { delivered: false, skipped: "no_provider" };
  }
  if (!from) {
    console.error("[email] POSTMARK_FROM_EMAIL not set — refusing to send");
    return { delivered: false, skipped: "no_from_address" };
  }

  try {
    const result = await c.sendEmail({
      From: from,
      To: params.to,
      Subject: params.subject,
      TextBody: params.textBody,
      HtmlBody: params.htmlBody,
      ReplyTo: params.replyTo,
      Tag: params.tag,
      Metadata: params.metadata,
      MessageStream: env.POSTMARK_MESSAGE_STREAM || "outbound",
      TrackOpens: true,
    });
    return { delivered: true, messageId: result.MessageID };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] send failed:", message);
    return { delivered: false, error: message };
  }
}
