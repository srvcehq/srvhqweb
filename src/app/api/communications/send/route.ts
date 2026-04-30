import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const COMMS_CAPACITY = 30;
const COMMS_WINDOW_MS = 60_000;

const bodySchema = z
  .object({
    sms: z
      .object({
        to: z.string().min(1),
        body: z.string().min(1).max(1600),
      })
      .optional(),
    email: z
      .object({
        to: z.string().email(),
        subject: z.string().min(1).max(998),
        body: z.string().min(1),
        htmlBody: z.string().optional(),
        replyTo: z.string().email().optional(),
        tag: z.string().max(64).optional(),
      })
      .optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .refine((v) => v.sms || v.email, { message: "Provide at least one of sms or email" });

export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`comms:${getClientIp(request)}`, COMMS_CAPACITY, COMMS_WINDOW_MS);
  if (!limit.ok) return rateLimitResponse(limit);

  let parsed;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: err instanceof z.ZodError ? err.issues : undefined },
      { status: 400 }
    );
  }

  const results: {
    sms?: Awaited<ReturnType<typeof sendSms>>;
    email?: Awaited<ReturnType<typeof sendEmail>>;
  } = {};

  if (parsed.sms) {
    results.sms = await sendSms({
      to: parsed.sms.to,
      body: parsed.sms.body,
    });
  }

  if (parsed.email) {
    results.email = await sendEmail({
      to: parsed.email.to,
      subject: parsed.email.subject,
      textBody: parsed.email.body,
      htmlBody: parsed.email.htmlBody,
      replyTo: parsed.email.replyTo,
      tag: parsed.email.tag,
      metadata: parsed.metadata,
    });
  }

  const anyDelivered = (results.sms?.delivered ?? false) || (results.email?.delivered ?? false);
  const anySkipped =
    Boolean(results.sms?.skipped) || Boolean(results.email?.skipped);
  const anyError = Boolean(results.sms?.error) || Boolean(results.email?.error);

  return NextResponse.json({
    success: anyDelivered || (!anyError && !parsed.sms && !parsed.email),
    delivered: anyDelivered,
    skipped: anySkipped,
    results,
  });
}
