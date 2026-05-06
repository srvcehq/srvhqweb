import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  CreditCard,
  Image as ImageIcon,
} from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
  proposed: { label: "Proposed", className: "bg-blue-50 text-blue-700 border-blue-200" },
  scheduled: { label: "Scheduled", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  in_progress: { label: "In Progress", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
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

export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: projectRow } = await supabase
    .from("projects")
    .select(
      "id, contact_id, title, description, status, scheduled_start_date, scheduled_end_date, total_amount, location_id, created_date"
    )
    .eq("id", id)
    .maybeSingle();

  const project = projectRow as
    | {
        id: string;
        contact_id: string;
        title: string;
        description: string | null;
        status: string;
        scheduled_start_date: string | null;
        scheduled_end_date: string | null;
        total_amount: number | string | null;
        location_id: string | null;
        created_date: string;
      }
    | null;

  if (!project) notFound();
  // CRITICAL: enforce ownership scope.
  if (project.contact_id !== session.contactId) notFound();

  const [milestonesRes, paymentsRes, photosRes, locationRes] = await Promise.all([
    supabase
      .from("milestones")
      .select("id, name, status, index")
      .eq("project_id", project.id)
      .order("index", { ascending: true }),
    supabase
      .from("payments")
      .select("id, type, amount, status, due_date, description")
      .eq("project_id", project.id)
      .eq("contact_id", session.contactId)
      .order("created_date", { ascending: false }),
    supabase
      .from("photos")
      .select("id, url, caption")
      .eq("project_id", project.id)
      .limit(6),
    project.location_id
      ? supabase
          .from("locations")
          .select("address_line1, address_line2, city, state, zip")
          .eq("id", project.location_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const milestones = (milestonesRes.data ?? []) as Array<{
    id: string;
    name: string;
    status: string;
    index: number;
  }>;
  const payments = (paymentsRes.data ?? []) as Array<{
    id: string;
    type: string;
    amount: number | string;
    status: string;
    due_date: string | null;
    description: string | null;
  }>;
  const photos = (photosRes.data ?? []) as Array<{
    id: string;
    url: string;
    caption: string | null;
  }>;
  const location = locationRes.data as {
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    zip?: string;
  } | null;

  const status = STATUS_BADGE[project.status] ?? STATUS_BADGE.draft;
  const completedMilestones = milestones.filter((m) => m.status === "done").length;
  const totalMilestones = milestones.length;
  const progressPct =
    totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/portal/projects"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      <header className="mb-6">
        <div className="flex items-start gap-3 mb-2 flex-wrap">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            {project.title}
          </h1>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        {project.description && (
          <p className="text-gray-600 mt-1">{project.description}</p>
        )}
      </header>

      {/* Top facts */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 mb-6">
        <div className="grid sm:grid-cols-3 gap-y-4 gap-x-6">
          <Fact
            icon={Calendar}
            label="Scheduled"
            value={
              project.scheduled_start_date
                ? `${formatDate(project.scheduled_start_date)}${
                    project.scheduled_end_date &&
                    project.scheduled_end_date !== project.scheduled_start_date
                      ? ` – ${formatDate(project.scheduled_end_date)}`
                      : ""
                  }`
                : "Not yet scheduled"
            }
          />
          <Fact
            icon={MapPin}
            label="Location"
            value={
              location
                ? `${location.address_line1 ?? ""}${
                    location.city ? `, ${location.city}, ${location.state} ${location.zip ?? ""}` : ""
                  }`
                : "—"
            }
          />
          <Fact
            icon={CreditCard}
            label="Total"
            value={formatCurrency(project.total_amount == null ? null : Number(project.total_amount))}
          />
        </div>
      </div>

      {/* Progress */}
      {milestones.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Progress
            </h2>
            <span className="text-xs text-gray-400">
              {completedMilestones} of {totalMilestones} complete
            </span>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] rounded-full transition-[width] duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <ul className="space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  {m.status === "done" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : m.status === "in_progress" ? (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                  )}
                  <span
                    className={
                      m.status === "done"
                        ? "text-gray-500 line-through"
                        : "text-gray-900"
                    }
                  >
                    {m.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Photos preview */}
      {photos.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Photos
            </h2>
            <Link
              href="/portal/photos"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption ?? "Project photo"}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Payments
            </h2>
            <Link
              href="/portal/payments"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              See all →
            </Link>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
            {payments.map((p) => {
              const amount = Number(p.amount ?? 0);
              return (
                <div key={p.id} className="flex items-center justify-between p-4 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {p.description || p.type}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {p.status} {p.due_date ? `· Due ${formatDate(p.due_date)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {milestones.length === 0 && photos.length === 0 && payments.length === 0 && (
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-10 text-center">
          <ImageIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-700 font-medium">No activity yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Updates from your contractor will appear here as work progresses.
          </p>
        </div>
      )}
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
