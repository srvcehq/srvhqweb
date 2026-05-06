import Link from "next/link";
import {
  CreditCard,
  FolderKanban,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ACTIVE_PROJECT_STATUSES = ["proposed", "scheduled", "in_progress"] as const;

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
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

export default async function DashboardPage() {
  // The (authed) layout has already verified the session, but read it again
  // to scope queries to this contact only.
  const session = await getPortalSession();
  if (!session) {
    return null; // layout will have redirected; defensive guard
  }

  const supabase = getSupabaseAdmin();

  const [{ data: contact }, unpaidPayments, activeProjects, nextVisit] = await Promise.all([
    supabase
      .from("contacts")
      .select("first_name")
      .eq("id", session.contactId)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("amount, due_date, type")
      .eq("contact_id", session.contactId)
      .eq("status", "unpaid"),
    supabase
      .from("projects")
      .select("id, title, status, scheduled_start_date")
      .eq("contact_id", session.contactId)
      .in("status", ACTIVE_PROJECT_STATUSES as unknown as string[]),
    supabase
      .from("maintenance_visits")
      .select("visit_date")
      .eq("contact_id", session.contactId)
      .eq("status", "scheduled")
      .order("visit_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstName =
    ((contact as { first_name?: string } | null)?.first_name ?? "").trim() || "there";

  const totalUnpaid = (
    (unpaidPayments.data ?? []) as { amount: number | string }[]
  ).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const unpaidCount = unpaidPayments.data?.length ?? 0;

  const activeProjectsCount = activeProjects.data?.length ?? 0;
  const nextProject = (activeProjects.data ?? [])[0] as
    | { title: string; scheduled_start_date: string | null; status: string }
    | undefined;

  const nextVisitDate =
    (nextVisit.data as { visit_date?: string } | null)?.visit_date ?? null;

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Hi {firstName} 👋
        </h1>
        <p className="mt-1 text-gray-600">
          Here&apos;s a quick look at your account.
        </p>
      </header>

      {totalUnpaid > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] p-6 text-white shadow-lg shadow-[#1B4332]/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm font-medium">
                Total Outstanding
              </p>
              <p className="text-3xl font-bold mt-1">
                {formatCurrency(totalUnpaid)}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {unpaidCount} unpaid invoice{unpaidCount === 1 ? "" : "s"}
              </p>
            </div>
            <Link
              href="/portal/payments"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1B4332] hover:bg-white/90 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              View &amp; Pay
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <SummaryTile
          href="/portal/payments"
          icon={CreditCard}
          label="Payments"
          primary={
            unpaidCount === 0
              ? "All paid up"
              : `${unpaidCount} due`
          }
          secondary={
            unpaidCount === 0
              ? "Nothing outstanding"
              : formatCurrency(totalUnpaid)
          }
        />
        <SummaryTile
          href="/portal/projects"
          icon={FolderKanban}
          label="Projects"
          primary={
            activeProjectsCount === 0
              ? "No active projects"
              : `${activeProjectsCount} active`
          }
          secondary={
            nextProject
              ? `${nextProject.title} · ${formatDate(nextProject.scheduled_start_date)}`
              : "—"
          }
        />
        <SummaryTile
          href="/portal/maintenance"
          icon={Wrench}
          label="Maintenance"
          primary={nextVisitDate ? "Next visit" : "No visits scheduled"}
          secondary={nextVisitDate ? formatDate(nextVisitDate) : "—"}
        />
      </div>
    </div>
  );
}

function SummaryTile({
  href,
  icon: Icon,
  label,
  primary,
  secondary,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:border-gray-200 hover:shadow-md transition-[box-shadow,border-color] duration-150"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-gray-500">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {label}
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-[transform,color] duration-150" />
      </div>
      <p className="text-lg font-semibold text-gray-900">{primary}</p>
      <p className="text-sm text-gray-500 mt-0.5 truncate">{secondary}</p>
    </Link>
  );
}
