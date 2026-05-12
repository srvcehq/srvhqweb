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

  const { data: contact } = await supabase
    .from("contacts")
    .select("first_name, last_name, email, company_id")
    .eq("id", session.contactId)
    .maybeSingle();

  // Hard requirement: the contact in the cookie must still exist. If they were
  // deleted, kick them out so they can't see anyone else's data.
  if (!contact) {
    redirect("/portal?reason=invalid");
  }

  const c = contact as {
    first_name?: string;
    last_name?: string;
    email?: string;
    company_id?: string;
  };

  // The portal is white-labeled to *this contact's* contractor.
  let companyName = FALLBACK_COMPANY_NAME;
  if (c.company_id) {
    const { data: settings } = await supabase
      .from("company_settings")
      .select("company_name")
      .eq("id", c.company_id)
      .maybeSingle();
    companyName =
      (settings as { company_name?: string } | null)?.company_name ?? FALLBACK_COMPANY_NAME;
  }

  const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || null;

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
