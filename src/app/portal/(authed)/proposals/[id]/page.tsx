import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  XCircle,
  Calendar,
  CreditCard,
} from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  sent: { label: "Awaiting Response", className: "bg-blue-50 text-blue-700 border-blue-200" },
  accepted: { label: "Accepted", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  declined: { label: "Declined", className: "bg-rose-50 text-rose-700 border-rose-200" },
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return Number(amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default async function PortalProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: bidRow } = await supabase
    .from("bids")
    .select(
      "id, contact_id, title, description, status, bid_total, deposit_amount, sent_at, accepted_at, created_date, scheduling_preference"
    )
    .eq("id", id)
    .maybeSingle();

  const bid = bidRow as
    | {
        id: string;
        contact_id: string;
        title: string | null;
        description: string | null;
        status: string;
        bid_total: number | string | null;
        deposit_amount: number | string | null;
        sent_at: string | null;
        accepted_at: string | null;
        created_date: string;
        scheduling_preference: string | null;
      }
    | null;

  if (!bid) notFound();
  // CRITICAL: enforce ownership scope.
  if (bid.contact_id !== session.contactId) notFound();

  const { data: lineRows } = await supabase
    .from("bid_line_items")
    .select("id, item_name, category, qty, unit, sell_price, sort_order, tier_index")
    .eq("bid_id", bid.id)
    .order("sort_order", { ascending: true });

  const lineItems = (lineRows ?? []) as Array<{
    id: string;
    item_name: string;
    category: string | null;
    qty: number | string | null;
    unit: string;
    sell_price: number | string | null;
    sort_order: number | null;
    tier_index: number | null;
  }>;

  const status = STATUS_BADGE[bid.status] ?? STATUS_BADGE.draft;
  const canRespond = bid.status === "sent";
  const total = bid.bid_total == null ? null : Number(bid.bid_total);
  const deposit = bid.deposit_amount == null ? null : Number(bid.deposit_amount);

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/portal/proposals"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Proposals
      </Link>

      <header className="mb-6">
        <div className="flex items-start gap-3 mb-2 flex-wrap">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            {bid.title || "Proposal"}
          </h1>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        {bid.description && (
          <p className="text-gray-600 mt-1">{bid.description}</p>
        )}
      </header>

      {/* Top facts */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 mb-6">
        <div className="grid sm:grid-cols-3 gap-y-4 gap-x-6">
          <Fact
            icon={Calendar}
            label="Sent"
            value={formatDate(bid.sent_at ?? bid.created_date)}
          />
          <Fact
            icon={FileText}
            label="Scheduling"
            value={bid.scheduling_preference || "—"}
          />
          <Fact
            icon={CreditCard}
            label="Deposit"
            value={deposit != null ? formatCurrency(deposit) : "—"}
          />
        </div>
      </div>

      {/* Line items */}
      {lineItems.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Scope of Work
          </h2>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Item
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-gray-500 hidden sm:table-cell">
                    Qty
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {item.item_name}
                      </p>
                      {item.category && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.category}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-gray-600 hidden sm:table-cell">
                      {Number(item.qty ?? 0)} {item.unit}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-gray-900">
                      {item.sell_price != null
                        ? formatCurrency(Number(item.sell_price))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Total + actions */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600">Subtotal</span>
          <span className="text-sm text-gray-700">{formatCurrency(total)}</span>
        </div>
        {deposit != null && deposit > 0 && (
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Deposit due</span>
            <span className="text-sm text-gray-700">
              {formatCurrency(deposit)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-gray-100 mt-4 pt-4">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(total)}
          </span>
        </div>

        {canRespond && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <form
              action={`/api/portal/proposals/${bid.id}/respond`}
              method="post"
              className="flex-1"
            >
              <input type="hidden" name="action" value="accept" />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-[box-shadow,transform] duration-150"
              >
                <CheckCircle2 className="w-4 h-4" />
                Accept Proposal
              </button>
            </form>
            <form
              action={`/api/portal/proposals/${bid.id}/respond`}
              method="post"
              className="flex-1"
            >
              <input type="hidden" name="action" value="decline" />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-white border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 active:translate-y-px transition-[border-color,background-color,transform] duration-150"
              >
                <XCircle className="w-4 h-4" />
                Decline
              </button>
            </form>
          </div>
        )}

        {bid.status === "accepted" && bid.accepted_at && (
          <p className="text-sm text-emerald-700 mt-4 bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            You accepted this proposal on {formatDate(bid.accepted_at)}.
          </p>
        )}

        {bid.status === "declined" && (
          <p className="text-sm text-gray-600 mt-4 bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            This proposal was declined.
          </p>
        )}
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
