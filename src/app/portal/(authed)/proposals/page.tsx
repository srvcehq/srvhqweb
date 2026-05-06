import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ArrowRight, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  sent: {
    label: "Awaiting Response",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
  },
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: FileText,
  },
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
    maximumFractionDigits: 0,
  });
}

export default async function PortalProposalsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const supabase = getSupabaseAdmin();

  const { data: rows } = await supabase
    .from("bids")
    .select(
      "id, title, description, status, bid_total, sent_at, accepted_at, created_date"
    )
    .eq("contact_id", session.contactId)
    .is("deleted_at", null)
    .neq("status", "draft")
    .order("created_date", { ascending: false });

  const proposals = (rows ?? []) as Array<{
    id: string;
    title: string | null;
    description: string | null;
    status: string;
    bid_total: number | string | null;
    sent_at: string | null;
    accepted_at: string | null;
    created_date: string;
  }>;

  const pending = proposals.filter((p) => p.status === "sent");
  const decided = proposals.filter((p) => p.status !== "sent");

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Proposals
        </h1>
        <p className="mt-1 text-gray-600">
          Review proposed work, accept what you want, decline what you don&apos;t.
        </p>
      </header>

      {proposals.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {pending.length > 0 && (
            <Section title="Awaiting Your Response" count={pending.length}>
              <div className="grid gap-4">
                {pending.map((p) => (
                  <ProposalCard key={p.id} proposal={p} highlight />
                ))}
              </div>
            </Section>
          )}

          {decided.length > 0 && (
            <Section title="Past Proposals" count={decided.length}>
              <div className="grid gap-4">
                {decided.map((p) => (
                  <ProposalCard key={p.id} proposal={p} />
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h2>
        <span className="text-xs text-gray-400">{count}</span>
      </div>
      {children}
    </section>
  );
}

function ProposalCard({
  proposal,
  highlight = false,
}: {
  proposal: {
    id: string;
    title: string | null;
    description: string | null;
    status: string;
    bid_total: number | string | null;
    sent_at: string | null;
    accepted_at: string | null;
    created_date: string;
  };
  highlight?: boolean;
}) {
  const meta = STATUS_BADGE[proposal.status] ?? STATUS_BADGE.draft;
  const Icon = meta.icon;
  return (
    <Link
      href={`/portal/proposals/${proposal.id}`}
      className={`group block rounded-2xl bg-white border shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150 p-5 ${
        highlight
          ? "border-[#1B4332]/20 ring-1 ring-[#1B4332]/10 hover:border-[#1B4332]/30"
          : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center shrink-0 shadow-sm shadow-[#1B4332]/20">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-gray-900 truncate">
              {proposal.title || "Proposal"}
            </h3>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 inline-flex items-center gap-1 ${meta.className}`}
            >
              <Icon className="w-3 h-3" />
              {meta.label}
            </span>
          </div>
          {proposal.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {proposal.description}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 mt-3">
            <span className="text-xs text-gray-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {proposal.sent_at
                ? `Sent ${formatDate(proposal.sent_at)}`
                : `Created ${formatDate(proposal.created_date)}`}
            </span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(
                proposal.bid_total == null ? null : Number(proposal.bid_total)
              )}
            </span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-[transform,color] duration-150 shrink-0 mt-1" />
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
      <p className="text-lg font-medium text-gray-900">No proposals yet</p>
      <p className="text-sm text-gray-500 mt-1">
        When your contractor sends an estimate, it will appear here.
      </p>
    </div>
  );
}
