import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import PortalShell from "./portal-shell";

const FALLBACK_COMPANY_NAME = "Client Portal";

export default async function AuthedPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  if (!session) {
    redirect("/portal");
  }

  const supabase = getSupabaseAdmin();

  const [{ data: contact }, { data: settings }] = await Promise.all([
    supabase
      .from("contacts")
      .select("first_name, last_name, email")
      .eq("id", session.contactId)
      .maybeSingle(),
    supabase
      .from("company_settings")
      .select("company_name")
      .limit(1)
      .maybeSingle(),
  ]);

  // Hard requirement: the contact in the cookie must still exist. If they were
  // deleted, kick them out so they can't see anyone else's data.
  if (!contact) {
    redirect("/portal?reason=invalid");
  }

  const c = contact as { first_name?: string; last_name?: string; email?: string };
  const s = settings as { company_name?: string } | null;
  const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || null;
  const companyName = s?.company_name ?? FALLBACK_COMPANY_NAME;

  return (
    <PortalShell
      contactName={fullName}
      contactEmail={c.email ?? null}
      companyName={companyName}
    >
      {children}
    </PortalShell>
  );
}
