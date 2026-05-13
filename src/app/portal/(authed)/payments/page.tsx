import { redirect } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowRight,
  Receipt,
  AlertCircle,
  Info,
} from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposit",
  final: "Final Payment",
  invoice: "Invoice",
  maintenance: "Maintenance",
};

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  unpaid: {
    label: "Unpaid",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  succeeded: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  partially_refunded: {
    label: "Partial Refund",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  refunded: {
    label: "Refunded",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PaymentRow {
  id: string;
  type: string;
  amount: number | string;
  status: string;
  description: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  created_date: string;
  project_id: string | null;
  bid_id: string | null;
  maintenance_plan_id: string | null;
}

export default async function PortalPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pid?: string; session_id?: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const supabase = getSupabaseAdmin();
  const sp = await searchParams;

  // Just back from Stripe Checkout — verify the session and mark the payment
  // paid right away (a backstop in case the webhook hasn't landed yet).
  if (sp.status === "success" && sp.session_id && sp.pid) {
    try {
      const checkout = await stripe().checkout.sessions.retrieve(sp.session_id);
      if (checkout.payment_status === "paid") {
        const pi = checkout.payment_intent;
        await supabase
          .from("payments")
          .update({
            status: "succeeded",
            paid_date: new Date().toISOString(),
            stripe_payment_intent_id: typeof pi === "string" ? pi : pi?.id ?? null,
            payment_method: "card",
          } as never)
          .eq("id", sp.pid)
          .eq("contact_id", session.contactId);
      }
    } catch (err) {
      console.error("[portal/payments] checkout verify failed", err);
    }
  }

  const { data: rows } = await supabase
    .from("payments")
    .select(
      "id, type, amount, status, description, due_date, paid_date, payment_method, created_date, project_id, bid_id, maintenance_plan_id"
    )
    .eq("contact_id", session.contactId)
    .order("created_date", { ascending: false });

  const payments: PaymentRow[] = (rows ?? []) as PaymentRow[];

  const unpaid = payments.filter((p) => p.status === "unpaid");
  const processing = payments.filter((p) => p.status === "processing");
  const history = payments.filter(
    (p) => p.status !== "unpaid" && p.status !== "processing"
  );

  const totalUnpaid = unpaid.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const totalProcessing = processing.reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Payments
        </h1>
        <p className="mt-1 text-gray-600">
          View invoices, pay outstanding balances, and see your payment history.
        </p>
      </header>

      {sp.status === "success" && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-800">Payment received — thank you!</p>
            <p className="text-sm text-emerald-700">It&rsquo;s now marked paid below. A receipt was sent to your email.</p>
          </div>
        </div>
      )}
      {sp.status === "already_paid" && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
          <Info className="h-5 w-5 shrink-0 text-blue-600" />
          <p className="font-medium text-blue-800">That invoice is already settled — nothing more to pay.</p>
        </div>
      )}
      {sp.status === "cancelled" && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="font-medium text-amber-800">Payment cancelled — you can try again whenever you&rsquo;re ready.</p>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <SummaryTile
          icon={Clock}
          iconClass="text-amber-600 bg-amber-50"
          label="Outstanding"
          primary={formatCurrency(totalUnpaid)}
          secondary={`${unpaid.length} unpaid invoice${unpaid.length === 1 ? "" : "s"}`}
        />
        <SummaryTile
          icon={CreditCard}
          iconClass="text-blue-600 bg-blue-50"
          label="Processing"
          primary={formatCurrency(totalProcessing)}
          secondary={`${processing.length} pending`}
        />
        <SummaryTile
          icon={CheckCircle2}
          iconClass="text-emerald-600 bg-emerald-50"
          label="Paid"
          primary={`${payments.filter((p) => p.status === "succeeded").length}`}
          secondary="Successful payments"
        />
      </div>

      {/* Outstanding section */}
      {unpaid.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Outstanding
            </h2>
            <span className="text-xs text-gray-400">
              {unpaid.length} invoice{unpaid.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {unpaid.map((p) => (
              <PaymentRowCard key={p.id} payment={p} payable />
            ))}
          </div>
        </section>
      )}

      {/* Processing section */}
      {processing.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Processing
          </h2>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {processing.map((p) => (
              <PaymentRowCard key={p.id} payment={p} />
            ))}
          </div>
        </section>
      )}

      {/* History section */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          History
        </h2>
        {history.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-10 text-center">
            <Receipt className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-700 font-medium">No past payments yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Once you pay an invoice, it will show up here.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {history.map((p) => (
              <PaymentRowCard key={p.id} payment={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  iconClass,
  label,
  primary,
  secondary,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconClass}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{primary}</p>
      <p className="text-sm text-gray-500 mt-0.5">{secondary}</p>
    </div>
  );
}

function PaymentRowCard({
  payment,
  payable = false,
}: {
  payment: PaymentRow;
  payable?: boolean;
}) {
  const status = STATUS_BADGE[payment.status] ?? STATUS_BADGE.unpaid;
  const amount = Number(payment.amount ?? 0);

  return (
    <div className="flex items-center gap-4 p-5 hover:bg-gray-50/60 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 truncate">
            {payment.description || TYPE_LABELS[payment.type] || "Invoice"}
          </p>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {TYPE_LABELS[payment.type] ?? payment.type}
          {payment.due_date && ` · Due ${formatDate(payment.due_date)}`}
          {payment.paid_date && ` · Paid ${formatDate(payment.paid_date)}`}
          {payment.payment_method &&
            ` · ${payment.payment_method.charAt(0).toUpperCase()}${payment.payment_method.slice(1)}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-gray-900 text-lg">
          {formatCurrency(amount)}
        </p>
      </div>
      {payable && (
        <form action={`/api/portal/pay/${payment.id}`} method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-[box-shadow,transform] duration-150"
          >
            Pay Now
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

