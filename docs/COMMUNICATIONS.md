# TerraFlow Communications — Postmark + Twilio Setup

## What's wired

| Channel | Provider | Status |
|---|---|---|
| Email | Postmark | Real send when `POSTMARK_*` env vars set; falls back to `console.log` |
| SMS | Twilio | Real send when `TWILIO_*` env vars set; falls back to `console.log` |

All comms flow through `POST /api/communications/send`, which is rate-limited to **30 req/min/IP**.

## Required environment variables

### Email (Postmark)
```
POSTMARK_SERVER_TOKEN=         # Postmark Dashboard → Servers → API Tokens
POSTMARK_FROM_EMAIL=           # Must match a verified Sender Signature or Domain
POSTMARK_MESSAGE_STREAM=outbound  # Default; use a different stream for marketing
```

### SMS (Twilio)
```
TWILIO_ACCOUNT_SID=            # Twilio Console (starts with AC)
TWILIO_AUTH_TOKEN=             # Same page; HIGHLY SENSITIVE
TWILIO_FROM_NUMBER=+1XXXXXXXXXX  # E.164 format, must be Twilio-owned
```

### Magic link tokens
```
MAGIC_LINK_SECRET=             # 32+ char random; generate with: openssl rand -hex 32
```

## Postmark setup checklist

1. **Create account** at postmarkapp.com — free tier covers 100 emails/month
2. **Create a Server** (e.g. "TerraFlow Production") — gets you a Server Token
3. **Verify sender domain** (recommended) or single Sender Signature:
   - Domain verification adds DKIM + Return-Path DNS records — better deliverability
   - Sender Signature only verifies a single email address — quicker, weaker deliverability
4. **Add SPF record** to your sending domain DNS:
   ```
   TXT  @  "v=spf1 a mx include:spf.mtasv.net ~all"
   ```
5. **Add DKIM record** Postmark provides during domain verification
6. **(Optional but recommended) Add DMARC record**:
   ```
   TXT  _dmarc  "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
   ```
7. **Test from Postmark dashboard** — send a test message to your inbox before going live
8. **Set Server Token + From Email** in `.env.local` (dev) and Netlify env vars (prod)

## Twilio setup checklist

1. **Create account** at twilio.com — free trial gets ~$15 credit
2. **Buy a phone number** (Console → Phone Numbers → Manage → Buy a number)
   - SMS-capable, US local number — ~$1.15/mo
3. **Set Account SID + Auth Token + From Number** in env vars

### A2P 10DLC registration (production-blocking)

Twilio cannot reliably send SMS to US numbers at scale **without** A2P 10DLC registration. **Start this NOW** — approval takes 1–3 weeks.

1. **Console → Messaging → Regulatory Compliance → A2P 10DLC**
2. **Register a Brand**:
   - Best path: registered LLC or corporation with EIN — Standard Brand vetting
   - Solo / sole-proprietor: Sole Proprietor Brand — lower throughput, may face longer review
3. **Register a Campaign**:
   - Pick "Customer Care" or "Mixed" use case for TerraFlow
   - Sample messages: paste 2–3 actual templates from your `lib/communications.ts`
   - Opt-in flow description: "Customer signs up via TerraFlow business with their contractor; receives transactional updates about their service"
4. **Wait for approval** (typically 1–3 weeks). Some Sole Proprietor reviews take longer.
5. **Associate phone number with campaign** once approved

Until approved, you can send to your own verified Twilio test numbers immediately.

## How comms flow

### Client-triggered (button clicks)
1. User clicks button (e.g. "Send Invoice")
2. React calls `useSendCommunication().sendInvoice(...)`
3. Hook → `lib/communications.ts:sendCommunication()`
4. Builds template, creates audit `Communication` record (mock store), `POST /api/communications/send`
5. Route handler validates input, calls `sendEmail` and/or `sendSms`, returns delivery result

### Webhook-triggered (auto)
For events that don't have a UI button — `payment_intent.payment_failed`, `charge.refunded`:
1. Stripe sends webhook event
2. `/api/stripe/webhook` verifies signature, dispatches handler
3. Handler calls `sendEmail`/`sendSms` directly (server-side, no API hop)

## Comms catalog

Defined in `src/lib/communications.ts`:

| Action | Trigger | Channels |
|---|---|---|
| `send_invoice` | Payments → Send Invoice | sms+email |
| `send_estimate` | Bids → Send to Homeowner; Live Estimating → Save & Send | sms+email |
| `send_deposit_scheduled` | Projects → Schedule & Send Deposit | sms+email |
| `send_deposit_approved` | Projects → Accept & Send Deposit | sms+email |
| `send_final_payment` | Projects → Complete & Send Final Pay Link | sms+email |
| `send_login_link` | Contacts → Send Client Login Link | sms+email |
| `send_invite_link` | Contacts → Send Invite Link (new clients) | sms+email |
| `send_service_pay_link` | Schedule → Mark Complete + Send Pay Link | sms+email |
| `send_card_charged` | Schedule → Charge Card (confirmation) | sms+email |
| `resend_pay_link` | Payments → Resend Pay Link | sms+email |
| `resend_deposit_link` | (Hook only — UI not yet wired) | sms+email |
| `resend_estimate` | Bids → Resend | sms+email |
| `resend_final_payment` | (Hook only — UI not yet wired) | sms+email |
| `resend_invite_link` | Contacts → Resend Invite Link | sms+email |
| `payment_reminder` | (Hook only — needs cron + DB to fire automatically) | sms+email |
| `deposit_reminder` | (Hook only — needs cron + DB) | sms+email |
| `final_payment_reminder` | (Hook only — needs cron + DB) | sms+email |
| `payment_failed` | Auto: Stripe webhook on `payment_intent.payment_failed` | email (sms if phone in event) |
| `charge_refunded` | Auto: Stripe webhook on `charge.refunded` | email (sms if phone in event) |
| `ach_failed` | (Hook only — wire when ACH support added) | sms+email |

## Magic links

`src/lib/magic-links.ts` provides HMAC-signed tokens for:
- `bid_view` (30-day TTL) — clients view a bid without logging in
- `client_login` (7-day TTL) — quick portal access
- `invite` (14-day TTL) — first-time portal setup
- `payment` (7-day TTL) — short-lived pay link (we currently use Stripe Checkout URLs instead)

Tokens are self-contained (no DB lookup needed to verify). **Caveat:** can't be revoked individually without a DB-backed revocation list — mitigated by short TTLs.

The bid/login/portal *pages* don't exist yet, so the URLs in messages currently point at routes that 404. Wire those pages when adding auth + portal in a future phase.

## Testing without real credentials

The integration is designed to **gracefully no-op** when env vars are missing:

- `sendEmail` returns `{ delivered: false, skipped: "no_provider" }` and logs to console
- `sendSms` does the same

This means you can develop and test the *flow* (button → comm record → API call) without burning credentials or sending real messages.

To get end-to-end testing without spamming real users:
- **Postmark**: use a "Sandbox" message stream (dev-mode only — Postmark caps at 10/day)
- **Twilio**: send only to your own verified phone number in trial mode
- **For both**: log everything by checking the server console — every send goes through `console.log` even if also delivered

## What to do if a token leaks

Same playbook as Stripe (see `SECURITY.md`):

### Postmark Server Token
1. Postmark Dashboard → Servers → [your server] → API Tokens → **Delete** the leaked token, create new
2. Update env vars + redeploy

### Twilio Auth Token
1. Twilio Console → Account → API keys & tokens → **Rotate Auth Token**
2. **EVERY** integration using the old token will break instantly — make sure to update Netlify before rotating
3. Order: paste new token in Netlify → trigger redeploy → confirm app works → then click rotate

### Magic Link Secret
- Rotating invalidates **every outstanding magic link** instantly
- Acceptable if leaked (clients just need new links sent)
- Generate new: `openssl rand -hex 32`
