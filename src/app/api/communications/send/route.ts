import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/communications/send
 *
 * Sends SMS and/or email to a contact.
 *
 * When Twilio and an email provider (SendGrid, Google, etc.) are
 * configured, this route will call their APIs. Until then it logs
 * the request and returns success so the frontend flow works end-to-end.
 *
 * Expected body:
 * {
 *   sms?: { to: string; body: string }
 *   email?: { to: string; subject: string; body: string }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const results: { sms?: string; email?: string } = {};

    if (body.sms?.to && body.sms?.body) {
      // TODO: Twilio integration
      // const twilio = require("twilio")(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
      // await twilio.messages.create({
      //   to: body.sms.to,
      //   from: process.env.TWILIO_FROM_NUMBER,
      //   body: body.sms.body,
      // });

      console.log("[SMS] To:", body.sms.to, "| Body:", body.sms.body);
      results.sms = "sent";
    }

    if (body.email?.to && body.email?.body) {
      // TODO: Email provider integration (SendGrid / Google / Resend / etc.)
      // const sgMail = require("@sendgrid/mail");
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: body.email.to,
      //   from: process.env.FROM_EMAIL,
      //   subject: body.email.subject,
      //   text: body.email.body,
      // });

      console.log("[Email] To:", body.email.to, "| Subject:", body.email.subject);
      results.email = "sent";
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[Communications] Send error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send communication" },
      { status: 500 }
    );
  }
}
