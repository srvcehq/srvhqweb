# Stripe Production Handoff

Everything you need to do in the Stripe Dashboard to flip TerraFlow from test → live and turn on the SaaS subscription paywall. Code is already wired — your job is the dashboard config plus four env vars at the end.

Estimated time: 30–45 minutes.

---

## 1. Activate the live account

Stripe Dashboard → top-left toggle from **Test mode** → **Live mode**.

If the account isn't activated yet:
- Settings → Account details → fill in business info (legal entity, EIN/SSN, MCC, support phone)
- Settings → Bank accounts and scheduling → add the payout bank
- Wait for "Charges enabled" + "Payouts enabled" to turn green

You can't proceed until live mode is active.

---

## 2. Create the subscription Product + Price

Live mode → Product catalog → **+ Add product**.

- **Name**: TerraFlow Subscription
- **Description**: TerraFlow contractor app monthly subscription
- **Pricing model**: Standard pricing
- **Price**: (whatever the founder decides — e.g. $99.00 USD)
- **Billing period**: Monthly (or whatever cadence)
- **Free trial**: optional — set days here if we want trials (e.g. 14)
- Save

After save, click into the product → copy the **Price ID** (starts with `price_…`). You'll send this back as `STRIPE_PRICE_ID`.

---

## 3. Configure the Customer Portal

Live mode → Settings → Billing → Customer portal.

Turn on:
- ✅ Customers can update payment methods
- ✅ Customers can update billing/shipping addresses (optional)
- ✅ Customers can cancel subscriptions
- Cancellation mode: **Cancel at end of billing period** (recommended)
- ✅ Customers can switch plans (optional, only if you have multiple prices)
- Set the business name + support email + privacy policy + ToS URLs

Save.

---

## 4. Create the webhook endpoints (TWO of them)

Stripe requires separate endpoints for events on the platform account vs. events
on connected accounts. Both endpoints can share the same URL (our code verifies
against either signing secret), but each has its own signature.

### 4a. Platform webhook (subscriptions)

Live mode → Developers → Webhooks → **+ Add an endpoint**.

- **Endpoint URL**: `https://www.srvcehq.com/api/stripe/webhook`
- **Description**: TerraFlow platform (subscriptions)
- **Listen to events on**: **Your account**
- **Events to send** — select exactly:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Save → click into the endpoint → reveal the **Signing secret** (`whsec_…`).
  Send back as `STRIPE_WEBHOOK_SECRET`.

### 4b. Connect webhook (client payments + contractor onboarding)

Live mode → Developers → Webhooks → **+ Add an endpoint**.

- **Endpoint URL**: `https://www.srvcehq.com/api/stripe/webhook`  *(same URL)*
- **Description**: TerraFlow Connect (client payments + payouts)
- **Listen to events on**: **Events on Connected accounts** (the second tab/option when adding an endpoint)
- **Events to send** — select exactly:
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `account.updated`
- Save → click into the endpoint → reveal the **Signing secret** (`whsec_…`).
  Send back as `STRIPE_CONNECT_WEBHOOK_SECRET`. **Different value from 4a.**

> Why two endpoints? When a client pays an invoice via Stripe Checkout on a
> connected contractor account, Stripe fires those events on the *connected*
> account, not the platform. Only an endpoint with "Connected accounts" mode
> will receive them. Subscription events fire on the platform account.

---

## 5. Send back these env vars

The founder will paste these into Netlify (Site settings → Environment variables):

| Var | Where it comes from |
|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys → **Live secret key** (`sk_live_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Developers → API keys → **Live publishable key** (`pk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Step 4a — platform webhook signing secret (`whsec_…`) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Step 4b — Connect webhook signing secret (`whsec_…`, different from 4a) |
| `STRIPE_PRICE_ID` | Step 2 — product price ID (`price_…`) |

Optional:
- `STRIPE_PLATFORM_FEE_BPS` — basis points fee on client-portal payments (currently `0`). Set to e.g. `100` for 1%.

---

## 6. DB migrations the founder needs to run

In Supabase SQL editor (project `zcmxkgipxgoorvsyolqt`), paste the contents of:

1. **`supabase/migrations/005_billing.sql`** — adds the columns the subscription
   webhook writes to (`stripe_customer_id`, `subscription_status`, etc.) on
   `company_settings`.
2. **`supabase/migrations/006_contact_stripe_customer.sql`** — adds
   `stripe_customer_id` to `contacts` so cards stay on file across portal
   payments (one-click reuse on the second invoice onward).

Both are idempotent (`if not exists` on every column).

## 7. Save cards on file for client portal payments

Already wired in code — no Stripe Dashboard work required, but check one toggle:

**Stripe Dashboard → Settings → Payments → Checkout and Payment Links**

- Confirm **"Saved payment methods"** is enabled (default is enabled). When
  enabled, Stripe Checkout automatically shows the saved card on subsequent
  visits with a one-click pay button.

Optional polish:
- **Settings → Branding** — set the company logo, accent color, icon. This
  shows on Checkout, the customer portal, and emails. The portal already
  uses the green/emerald gradient — pick something close.

### How it works (so the dev knows what to expect)

1. First time a contact pays via `/portal/payments`:
   - Code creates a Stripe Customer (platform-side, since we use destination
     charges) with the contact's email + name + phone, stores
     `stripe_customer_id` on the `contacts` row.
   - Checkout session is created with `customer: cus_…` and
     `payment_intent_data.setup_future_usage = "off_session"`.
   - Stripe collects the card, charges it, and saves the payment method to the
     Customer.
2. Next time the same contact pays:
   - We read their `stripe_customer_id` from `contacts`.
   - Checkout session is created with `customer: cus_…` (same Customer).
   - Stripe Checkout shows their saved card with a one-click "Pay" button.
3. If migration 006 isn't applied yet, the route logs a warning and falls back
   to the old stateless flow (no card saving). Nothing breaks.

No Connect-account-side card saving — every contact's cards live on the
platform Customer because we run destination charges, not direct charges.

## 8. Production polish (must-do)

Five quick configuration items in the Stripe Dashboard before we go live.
None require code.

### 8a. Connect platform settings
**Settings → Connect → Settings**

Contractors who onboard their Stripe account through TerraFlow see the platform
brand on Stripe's hosted onboarding pages. Without this, they see generic Stripe
copy and lose trust.
- **Platform name**: TerraFlow
- **Support email**: support@srvcehq.com (or whatever the founder uses)
- **Privacy policy URL**: https://www.srvcehq.com/privacy *(pending — see note below)*
- **Terms of service URL**: https://www.srvcehq.com/terms *(pending)*

### 8b. Public business profile
**Settings → Business details → Public details**

This is the merchant info shown on Checkout pages and customer receipts.
- **Public business name**: TerraFlow
- **Customer support email**: support@srvcehq.com
- **Customer support phone**: (the toll-free number the founder set up)
- **Business website**: https://www.srvcehq.com

### 8c. Statement descriptor
**Settings → Business details → Public details → Statement descriptor**

What shows on a customer's bank/card statement. Default is the legal entity
name, which is usually ugly.
- **Statement descriptor**: `SRVCEHQ` or `TERRAFLOW` (max 22 chars,
  alphanumeric + spaces, no special chars)
- **Shortened descriptor**: `SRVCEHQ` (max 10 chars, used by some card networks)

### 8d. Customer Portal legal links
**Settings → Billing → Customer portal**

The portal we configured in Step 3 needs:
- **Terms of service URL**: https://www.srvcehq.com/terms
- **Privacy policy URL**: https://www.srvcehq.com/privacy

> ⚠️ The legal pages don't exist yet — the founder is shipping them this week.
> Use placeholder URLs for now and update once the pages are live, OR wait
> until they're up to flip into live mode.

### 8e. Webhook delivery alerts
**Developers → Webhooks → click each endpoint → Notifications**

Enable email alerts for failed webhook deliveries on **both** endpoints
(platform + Connect). Without these, a silent webhook failure means payments
in Stripe but nothing updated in our DB, and we'd never know.

---

## 9. Production polish (recommended, not blocking)

| Item | Where | Why |
|---|---|---|
| Email receipts | Settings → Emails | Confirm "Successful payments" + "Refunds" toggles are on (default: on). Auto-sends to customers. |
| Payout schedule | Settings → Payouts | Default daily automatic. Confirm or change to weekly. |
| Branding | Settings → Branding | Logo, accent color, icon — appears on Checkout, Customer Portal, and emails. Use TerraFlow green (`#16a34a` / emerald gradient). |

## 10. Skip for v1 (we'll add later if needed)

- **Stripe Tax** — only needed for multi-state US sales tax or international VAT.
- **Apple Pay / Google Pay** — needs domain verification; easy to add later.
- **Radar custom rules** — defaults are fine.
- **Email branding HTML** — defaults are clean.

---

## How to verify it works

After everything is set:

1. Visit https://www.srvcehq.com — sign in.
2. The app should bounce you to `/billing/locked` (no subscription on file).
3. Click **Start subscription** → lands on Stripe Checkout.
4. Pay with a real card (or in test mode, use `4242 4242 4242 4242`).
5. Returns to `/billing/success` → click into dashboard.
6. Webhook should have written `subscription_status = 'active'` (verify in Supabase: `select subscription_status from company_settings;`).
7. Cancel via the customer portal (`POST /api/billing/portal`) → Stripe sends `customer.subscription.updated` → webhook flips status → next page load bounces to `/billing/locked`.

If a webhook fails, Developers → Webhooks → click the endpoint → see the failed events with response bodies for debugging. Both endpoints (platform + Connect) should show 200 responses.

**Verifying the Connect webhook specifically:** sign in to the client portal as a contact (the founder can mint a test invite link), click Pay Now on an outstanding payment, complete checkout. Then in Supabase: `select id, status, paid_date, stripe_payment_intent_id from payments where status = 'succeeded' order by updated_date desc limit 5;` — should show the new row.

---

## Things I (the founder) am keeping out of your scope

- No code changes needed on your end. All routes (`/api/billing/checkout`, `/api/billing/portal`, `/api/stripe/webhook`) are already built.
- The middleware paywall gate is already wired.
- The locked / success pages are already built.
- The Stripe Connect flow (contractor onboarding for payouts) is already built — you're not touching that, you're just adding the SaaS subscription on top.
