import Link from "next/link";
import { redirect } from "next/navigation";
import { Image as ImageIcon, FolderKanban } from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface PhotoRow {
  id: string;
  url: string;
  caption: string | null;
  uploaded_at: string | null;
  project_id: string;
}

interface ProjectRow {
  id: string;
  title: string;
  status: string;
}

export default async function PortalPhotosPage() {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const supabase = getSupabaseAdmin();

  // First, get the contact's projects so we can scope photos to them.
  // (Photos are joined to projects, not contacts directly.)
  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, title, status")
    .eq("contact_id", session.contactId);

  const projects = (projectRows ?? []) as ProjectRow[];
  const projectIds = projects.map((p) => p.id);

  if (projectIds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Photos
          </h1>
          <p className="mt-1 text-gray-600">
            Visual progress updates from your projects.
          </p>
        </header>
        <EmptyState />
      </div>
    );
  }

  const { data: photoRows } = await supabase
    .from("photos")
    .select("id, url, caption, uploaded_at, project_id")
    .in("project_id", projectIds)
    .order("uploaded_at", { ascending: false });

  const photos = (photoRows ?? []) as PhotoRow[];

  const projectsById = new Map(projects.map((p) => [p.id, p] as const));
  const photosByProject = new Map<string, PhotoRow[]>();
  for (const photo of photos) {
    const list = photosByProject.get(photo.project_id) ?? [];
    list.push(photo);
    photosByProject.set(photo.project_id, list);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Photos
        </h1>
        <p className="mt-1 text-gray-600">
          Visual progress updates from your projects.
        </p>
      </header>

      {photos.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {Array.from(photosByProject.entries()).map(([projectId, list]) => {
            const project = projectsById.get(projectId);
            if (!project) return null;
            return (
              <section key={projectId}>
                <div className="flex items-center justify-between mb-3">
                  <Link
                    href={`/portal/projects/${projectId}`}
                    className="group flex items-center gap-2 hover:text-gray-900 text-gray-700 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center shrink-0 shadow-sm shadow-[#1B4332]/20">
                      <FolderKanban className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="font-semibold group-hover:underline">
                      {project.title}
                    </h2>
                  </Link>
                  <span className="text-xs text-gray-400">
                    {list.length} photo{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {list.map((photo) => (
                    <PhotoCard key={photo.id} photo={photo} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhotoCard({ photo }: { photo: PhotoRow }) {
  return (
    <a
      href={photo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-[box-shadow,border-color] duration-150 block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption ?? "Project photo"}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      {(photo.caption || photo.uploaded_at) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {photo.caption && (
            <p className="font-medium line-clamp-2">{photo.caption}</p>
          )}
          {photo.uploaded_at && (
            <p className="text-white/80 mt-0.5">
              {formatDate(photo.uploaded_at)}
            </p>
          )}
        </div>
      )}
    </a>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-12 text-center">
      <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
      <p className="text-lg font-medium text-gray-900">No photos yet</p>
      <p className="text-sm text-gray-500 mt-1">
        Photos uploaded to your projects will appear here.
      </p>
    </div>
  );
}
