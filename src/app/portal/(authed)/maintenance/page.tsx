import { redirect } from "next/navigation";
import {
  Wrench,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Repeat,
} from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VISIT_STATUS: Record<string, { label: string; className: string; icon: React.ComponentType<{ className?: string }> }> = {
  scheduled: {
    label: "Scheduled",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-600 border-gray-200",
    icon: XCircle,
  },
  skipped: {
    label: "Skipped",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: RotateCcw,
  },
};

const PLAN_STATUS: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { label: "Paused", className: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
  completed: { label: "Completed", className: "bg-blue-50 text-blue-700 border-blue-200" },
};

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Annually",
  custom: "Custom",
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

export default async function PortalMaintenancePage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const supabase = getSupabaseAdmin();

  const today = new Date().toISOString().slice(0, 10);

  const [plansRes, upcomingRes, pastRes] = await Promise.all([
    supabase
      .from("maintenance_plans")
      .select("id, title, status, frequency, billing_method, price_per_visit, monthly_price, start_date, end_date, notes")
      .eq("contact_id", session.contactId)
      .is("deleted_at", null)
      .order("created_date", { ascending: false }),
    supabase
      .from("maintenance_visits")
      .select("id, visit_date, status, service_performed, notes, \"amountDue\", payment_status")
      .eq("contact_id", session.contactId)
      .gte("visit_date", today)
      .order("visit_date", { ascending: true })
      .limit(10),
    supabase
      .from("maintenance_visits")
      .select("id, visit_date, status, service_performed, notes, \"amountDue\", payment_status")
      .eq("contact_id", session.contactId)
      .lt("visit_date", today)
      .order("visit_date", { ascending: false })
      .limit(20),
  ]);

  const plans = (plansRes.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    frequency: string;
    billing_method: string | null;
    price_per_visit: number | string | null;
    monthly_price: number | string | null;
    start_date: string | null;
    end_date: string | null;
    notes: string | null;
  }>;

  type VisitRow = {
    id: string;
    visit_date: string;
    status: string;
    service_performed: string | null;
    notes: string | null;
    amountDue: number | string | null;
    payment_status: string | null;
  };
  const upcomingVisits = (upcomingRes.data ?? []) as VisitRow[];
  const pastVisits = (pastRes.data ?? []) as VisitRow[];

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Maintenance
        </h1>
        <p className="mt-1 text-gray-600">
          Your service plans and upcoming visits.
        </p>
      </header>

      {plans.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Plans */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
              Your Plans
            </h2>
            <div className="grid gap-4">
              {plans.map((plan) => {
                const planStatus = PLAN_STATUS[plan.status] ?? PLAN_STATUS.active;
                const price =
                  plan.billing_method === "monthly"
                    ? plan.monthly_price
                    : plan.price_per_visit;
                const priceLabel =
                  plan.billing_method === "monthly" ? "/month" : "/visit";
                return (
                  <div
                    key={plan.id}
                    className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center shrink-0 shadow-sm shadow-[#1B4332]/20">
                        <Wrench className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <h3 className="font-semibold text-gray-900">
                            {plan.title}
                          </h3>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${planStatus.className}`}
                          >
                            {planStatus.label}
                          </span>
                        </div>
                        <div className="mt-3 grid sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5 flex items-center gap-1.5">
                              <Repeat className="w-3 h-3" />
                              Frequency
                            </p>
                            <p className="font-medium text-gray-900">
                              {FREQUENCY_LABELS[plan.frequency] ?? plan.frequency}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5">
                              Started
                            </p>
                            <p className="font-medium text-gray-900">
                              {formatDate(plan.start_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5">
                              Price
                            </p>
                            <p className="font-medium text-gray-900">
                              {price != null ? (
                                <>
                                  {formatCurrency(Number(price))}
                                  <span className="text-gray-500 font-normal">
                                    {priceLabel}
                                  </span>
                                </>
                              ) : (
                                "—"
                              )}
                            </p>
                          </div>
                        </div>
                        {plan.notes && (
                          <p className="text-sm text-gray-600 mt-3 bg-gray-50 rounded-lg p-3">
                            {plan.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Upcoming visits */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Upcoming Visits
              </h2>
              <span className="text-xs text-gray-400">
                {upcomingVisits.length}
              </span>
            </div>
            {upcomingVisits.length === 0 ? (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-8 text-center">
                <Calendar className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-600">No visits scheduled.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                {upcomingVisits.map((v) => (
                  <VisitRow key={v.id} visit={v} />
                ))}
              </div>
            )}
          </section>

          {/* Past visits */}
          {pastVisits.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Past Visits
              </h2>
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
                {pastVisits.map((v) => (
                  <VisitRow key={v.id} visit={v} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function VisitRow({
  visit,
}: {
  visit: {
    id: string;
    visit_date: string;
    status: string;
    service_performed: string | null;
    notes: string | null;
    amountDue: number | string | null;
    payment_status: string | null;
  };
}) {
  const meta = VISIT_STATUS[visit.status] ?? VISIT_STATUS.scheduled;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900">
            {formatDate(visit.visit_date)}
          </p>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.className}`}
          >
            {meta.label}
          </span>
        </div>
        {visit.service_performed && (
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
            {visit.service_performed}
          </p>
        )}
      </div>
      {visit.amountDue != null && Number(visit.amountDue) > 0 && (
        <div className="text-right shrink-0">
          <p className="font-semibold text-gray-900">
            {formatCurrency(Number(visit.amountDue))}
          </p>
          {visit.payment_status && (
            <p className="text-[11px] text-gray-500 mt-0.5 capitalize">
              {visit.payment_status}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
      <Wrench className="w-12 h-12 mx-auto text-gray-300 mb-4" />
      <p className="text-lg font-medium text-gray-900">No maintenance plan</p>
      <p className="text-sm text-gray-500 mt-1">
        Once you sign up for a recurring service plan, it will appear here.
      </p>
    </div>
  );
}
