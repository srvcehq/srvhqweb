# TerraFlow Security — API Keys & Secrets

## TL;DR

| Variable | Where it lives | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Server only | Never reference from client code |
| `STRIPE_WEBHOOK_SECRET` | Server only | Used to verify webhook signatures |
| `STRIPE_PLATFORM_FEE_BPS` | Server only | Optional, basis points (100 = 1%) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser (public) | Safe to expose by Stripe design |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser (public) | Secured by Google Cloud restrictions, not by hiding |
| `NEXT_PUBLIC_GOOGLE_MAP_ID` | Browser (public) | Map style ID, not sensitive |
| `NEXT_PUBLIC_APP_URL` | Both | Used in Stripe redirect URLs |

`NEXT_PUBLIC_` is a Next.js convention — those values are inlined into the browser bundle. Never put a secret behind that prefix.

## Local development

1. Copy `.env.example` to `.env.local`
2. Fill in real values (use Stripe **test mode** keys — `sk_test_*`, `pk_test_*`)
3. For local Stripe webhooks: install Stripe CLI and run `stripe listen --forward-to localhost:3000/api/stripe/webhook`. The CLI prints a `whsec_*` to use as `STRIPE_WEBHOOK_SECRET` for the dev session.
4. `npm run dev` — boot will fail fast with a Zod error if anything is malformed.

`.env.local` is gitignored. Never commit it.

## Production setup (Netlify)

### Set environment variables

Site settings → Environment variables → Add a variable. Set:

- `STRIPE_SECRET_KEY` (live mode, `sk_live_*`)
- `STRIPE_WEBHOOK_SECRET` (live webhook signing secret)
- `STRIPE_PLATFORM_FEE_BPS` (optional, e.g. `250` for 2.5%)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (live, `pk_live_*`)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAP_ID`
- `NEXT_PUBLIC_APP_URL` (your production domain, e.g. `https://app.terraflow.com`)

Mark Stripe secrets as **Sensitive** so the values don't render in build logs.

### Register the Stripe webhook

1. Stripe Dashboard → Developers → Webhooks → **Add endpoint**
2. URL: `https://your-domain.com/api/stripe/webhook`
3. Events to send (minimum):
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated` (Connect onboarding state)
4. Copy the **Signing secret** (`whsec_*`) → set as `STRIPE_WEBHOOK_SECRET`

The webhook endpoint **rejects unsigned or wrong-signature requests** in `src/app/api/stripe/webhook/route.ts`. Anyone hitting the URL without a valid signature gets a 400.

## Google Maps key restrictions (CRITICAL)

The Maps key is in the browser bundle. Anyone can view it. The only thing stopping abuse is **restrictions on the key**. Without these, someone can rack up thousands of dollars on your bill in a weekend.

Google Cloud Console → APIs & Services → Credentials → click your key:

1. **Application restrictions: HTTP referrers (web sites)**
   - `https://your-domain.com/*`
   - `https://*.netlify.app/*` (deploy previews)
   - `http://localhost:3000/*` (local dev)
2. **API restrictions: Restrict key**, allowlist only:
   - Maps JavaScript API
   - Places API (only if used)
   - Geocoding API (only if used)
3. **Billing → Budgets & alerts**: set a hard cap (e.g., $50/mo) with email alert at 50%. **Without this, a leaked key can run up unbounded charges.**

## Stripe key hygiene

- Use **restricted keys** for the platform secret if possible (Stripe → Developers → API keys → "Create restricted key"). Limit to only the resources TerraFlow actually uses (Checkout, Payment Intents, Connect, Webhooks).
- Stripe shows the secret key value **once** at creation. Save it directly to Netlify; do not paste into a doc/Slack/screenshot.
- Rotate immediately if leaked: Stripe Dashboard → roll the key, paste the new value into Netlify, redeploy.

## What to do if a key leaks

### Stripe secret key
1. Stripe Dashboard → Developers → API keys → click the leaked key → **Roll**
2. Paste new value into Netlify env vars, trigger a redeploy
3. Audit `Events` log for any unauthorized API calls during exposure window
4. If charges were created, refund them and reach out to Stripe support

### Stripe webhook secret
1. Webhook detail page → **Roll secret**
2. Update Netlify, redeploy
3. Pending events queued during the swap will retry; Stripe retries failed deliveries for up to 3 days

### Google Maps key
1. Cloud Console → Credentials → **Regenerate key** (or delete and create new)
2. Update Netlify env vars, redeploy
3. Check **Billing → Reports** for usage spike during the leak window

### Anything else
- If you suspect a `.env.local` was committed: `git log -- .env.local` to confirm, then **rotate every key in that file** even if you immediately deleted the commit. Once it's in any git history, assume it was scraped.

## Rate limiting

Server-side rate limits live in `src/lib/rate-limit.ts` (in-memory token bucket). Current limits:

| Route | Limit | Reason |
|---|---|---|
| `POST /api/stripe/checkout` | 10 / min / IP | Each call creates a Stripe Checkout Session |
| `POST /api/stripe/connect` | 3 / min / IP | Each call creates a Stripe Express account — tightly capped |
| `POST /api/stripe/webhook` | **Not rate-limited** | Stripe needs retries; signature verification is the gate |

Limit exceeded → returns `429 Too Many Requests` with a `Retry-After` header.

### Caveat: in-memory backend

The current implementation is per-process, so **each Netlify serverless instance has its own counter**. A determined attacker hitting many cold starts could exceed the per-IP cap in aggregate. This is fine pre-launch but should be upgraded before public traffic.

### Upgrading to distributed rate limiting (Upstash Redis)

When ready, swap the backend in `src/lib/rate-limit.ts`:

```bash
npm install @upstash/ratelimit @upstash/redis
```

Add env vars (Upstash dashboard → Console → REST API):
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Replace `checkRateLimit` body with `@upstash/ratelimit`'s `limit()` call, leave the route handlers untouched. Free tier covers 10K requests/day — more than enough for early traffic.

## Google Maps quota controls

Maps API requests come from the browser → Google directly, so there's no server hop where we can rate-limit. The actual protection lives in Google Cloud Console:

1. **Billing → Budgets & alerts**: hard cap (e.g., $25/mo) with alerts at 50/90/100% — *the most important step*
2. **APIs & Services → Quotas**: per-API request quotas, e.g., "Maps JavaScript API requests per minute per user" — set to a sane upper bound (1,000/min/user is generous)
3. **API key restrictions** (covered above): HTTP referrer + API allowlist
4. **Client-side throttling**: `/client-map` paces geocoder calls at ~16/sec to stay polite to Google's QPS limits

If you see unexpected usage spikes, check **APIs & Services → Metrics** to see which API + which referrer is responsible.

## Defense-in-depth checklist

- [x] `.env*` in `.gitignore`
- [x] Server keys validated by Zod at boot — app refuses to start without them
- [x] `getServerEnv()` throws if called from browser
- [x] Stripe webhook verifies signature — unsigned requests return 400
- [x] Stripe routes use Zod-validated input (no raw body trust)
- [x] Rate limit on `/api/stripe/checkout` and `/api/stripe/connect` (in-memory)
- [ ] Upgrade rate limit backend to Upstash Redis before public launch
- [ ] Sentry / error tracking on webhook failures — TODO
- [ ] Audit log table in DB once persistence is wired

## Useful Stripe CLI commands

```bash
# Forward live events to localhost during dev
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Replay a specific event for testing
stripe events resend evt_...

# Trigger a synthetic event
stripe trigger checkout.session.completed
```
