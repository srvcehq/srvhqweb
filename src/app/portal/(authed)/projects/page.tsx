import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban, ArrowRight, Calendar, MapPin } from "lucide-react";
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
    maximumFractionDigits: 0,
  });
}

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  scheduled_start_date: string | null;
  scheduled_end_date: string | null;
  total_amount: number | string | null;
  location_id: string | null;
  created_date: string;
}

interface LocationRow {
  id: string;
  address_line1: string;
  city: string;
  state: string;
}

export default async function PortalProjectsPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const supabase = getSupabaseAdmin();

  const { data: projectRows } = await supabase
    .from("projects")
    .select(
      "id, title, description, status, scheduled_start_date, scheduled_end_date, total_amount, location_id, created_date"
    )
    .eq("contact_id", session.contactId)
    .order("created_date", { ascending: false });

  const projects: ProjectRow[] = (projectRows ?? []) as ProjectRow[];

  const locationIds = Array.from(
    new Set(projects.map((p) => p.location_id).filter(Boolean) as string[])
  );

  const locations: LocationRow[] =
    locationIds.length === 0
      ? []
      : (
          (await supabase
            .from("locations")
            .select("id, address_line1, city, state")
            .in("id", locationIds)).data ?? []
        ) as LocationRow[];

  const locationsById = new Map(locations.map((l) => [l.id, l] as const));

  const active = projects.filter(
    (p) => p.status !== "completed" && p.status !== "archived"
  );
  const past = projects.filter(
    (p) => p.status === "completed" || p.status === "archived"
  );

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          My Projects
        </h1>
        <p className="mt-1 text-gray-600">
          Track work in progress and review completed jobs.
        </p>
      </header>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {active.length > 0 && (
            <Section title="Active" count={active.length}>
              <div className="grid gap-4">
                {active.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    location={p.location_id ? locationsById.get(p.location_id) ?? null : null}
                  />
                ))}
              </div>
            </Section>
          )}

          {past.length > 0 && (
            <Section title="Past" count={past.length}>
              <div className="grid gap-4">
                {past.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    location={p.location_id ? locationsById.get(p.location_id) ?? null : null}
                  />
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

function ProjectCard({
  project,
  location,
}: {
  project: ProjectRow;
  location: LocationRow | null;
}) {
  const status = STATUS_BADGE[project.status] ?? STATUS_BADGE.draft;
  return (
    <Link
      href={`/portal/projects/${project.id}`}
      className="group block rounded-2xl bg-white border border-gray-100 p-5 shadow-sm hover:border-gray-200 hover:shadow-md transition-[box-shadow,border-color] duration-150"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center shrink-0 shadow-sm shadow-[#1B4332]/20">
          <FolderKanban className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-gray-900 truncate">
              {project.title}
            </h3>
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${status.className}`}
            >
              {status.label}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(project.scheduled_start_date)}
              {project.scheduled_end_date &&
                project.scheduled_end_date !== project.scheduled_start_date &&
                ` – ${formatDate(project.scheduled_end_date)}`}
            </span>
            {location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {location.city}, {location.state}
              </span>
            )}
            {project.total_amount != null && (
              <span className="font-medium text-gray-700">
                {formatCurrency(Number(project.total_amount))}
              </span>
            )}
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
      <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-4" />
      <p className="text-lg font-medium text-gray-900">No projects yet</p>
      <p className="text-sm text-gray-500 mt-1">
        Once your contractor schedules a job, it will appear here.
      </p>
    </div>
  );
}
