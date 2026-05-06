import { Sprout } from "lucide-react";
import { getBilling } from "@/lib/billing";

export const dynamic = "force-dynamic";

const STATUS_COPY: Record<string, { title: string; body: string; cta: string }> = {
  past_due: {
    title: "Payment failed",
    body: "We couldn't charge your card. Update your payment method to keep your account active.",
    cta: "Update payment method",
  },
  canceled: {
    title: "Subscription canceled",
    body: "Your subscription was canceled. Resubscribe to get back into TerraFlow.",
    cta: "Resubscribe",
  },
  incomplete: {
    title: "Subscription incomplete",
    body: "Your last checkout didn't finish. Restart it to activate your account.",
    cta: "Complete subscription",
  },
  incomplete_expired: {
    title: "Checkout expired",
    body: "Your previous checkout expired. Start a new one to activate your account.",
    cta: "Start subscription",
  },
  unpaid: {
    title: "Account unpaid",
    body: "We've stopped retrying after multiple failed charges. Update your card to restore access.",
    cta: "Update payment method",
  },
};

const DEFAULT_COPY = {
  title: "Subscribe to TerraFlow",
  body: "Get access to the full TerraFlow contractor app — bids, scheduling, payments, and more.",
  cta: "Start subscription",
};

export default async function BillingLockedPage() {
  const billing = await getBilling();
  const status = billing?.subscription_status ?? null;
  const copy = (status && STATUS_COPY[status]) || DEFAULT_COPY;

  // If they already have a subscription on file (canceled, past_due, etc.)
  // route them through the customer portal so they update payment / resub
  // against the existing customer record. Otherwise fresh checkout.
  const action = billing?.stripe_customer_id ? "/api/billing/portal" : "/api/billing/checkout";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white">
          <Sprout className="w-5 h-5" />
        </div>
        <div className="font-semibold text-lg">TerraFlow</div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="text-gray-600 text-sm leading-relaxed">{copy.body}</p>
      </div>

      <form action={action} method="post">
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {copy.cta}
        </button>
      </form>

      {status === "past_due" && (
        <p className="text-xs text-amber-600 text-center">
          Heads up — your subscription is past due. We'll retry your card automatically.
        </p>
      )}

      <form action="/api/auth/sign-out" method="post" className="text-center">
        <button type="submit" className="text-xs text-gray-500 hover:text-gray-700">
          Sign out
        </button>
      </form>
    </div>
  );
}
