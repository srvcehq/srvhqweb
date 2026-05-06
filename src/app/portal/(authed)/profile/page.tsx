import { redirect } from "next/navigation";
import { User, Mail, MapPin, LogOut, Check } from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export default async function PortalProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await getPortalSession();
  if (!session) redirect("/portal");

  const params = await searchParams;
  const justSaved = params.saved === "1";

  const supabase = getSupabaseAdmin();

  const { data: contactRow } = await supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip"
    )
    .eq("id", session.contactId)
    .maybeSingle();

  const contact = contactRow as ContactRow | null;
  if (!contact) redirect("/portal?reason=invalid");

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          Profile
        </h1>
        <p className="mt-1 text-gray-600">
          Keep your contact information up to date.
        </p>
      </header>

      {justSaved && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
          <Check className="w-4 h-4" />
          Your profile has been updated.
        </div>
      )}

      <form
        action="/api/portal/profile"
        method="post"
        className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 mb-6 space-y-6"
      >
        <div>
          <SectionHeading icon={User} title="Name" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              name="first_name"
              label="First name"
              defaultValue={contact.first_name ?? ""}
              required
            />
            <Field
              name="last_name"
              label="Last name"
              defaultValue={contact.last_name ?? ""}
              required
            />
          </div>
        </div>

        <div>
          <SectionHeading icon={Mail} title="Contact" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              name="email"
              label="Email"
              type="email"
              defaultValue={contact.email ?? ""}
            />
            <Field
              name="phone"
              label="Phone"
              type="tel"
              defaultValue={contact.phone ?? ""}
            />
          </div>
        </div>

        <div>
          <SectionHeading icon={MapPin} title="Address" />
          <div className="grid gap-4">
            <Field
              name="address_line1"
              label="Street address"
              defaultValue={contact.address_line1 ?? ""}
            />
            <Field
              name="address_line2"
              label="Apt / Suite"
              defaultValue={contact.address_line2 ?? ""}
            />
            <div className="grid sm:grid-cols-3 gap-4">
              <Field
                name="city"
                label="City"
                defaultValue={contact.city ?? ""}
              />
              <Field
                name="state"
                label="State"
                defaultValue={contact.state ?? ""}
                maxLength={2}
              />
              <Field
                name="zip"
                label="ZIP"
                defaultValue={contact.zip ?? ""}
                maxLength={10}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 transition-[box-shadow,transform] duration-150"
          >
            Save Changes
          </button>
        </div>
      </form>

      {/* Sign out card */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Sign out</h2>
            <p className="text-sm text-gray-500 mt-1">
              You&apos;ll need a new invite link to sign back in.
            </p>
          </div>
          <form action="/api/portal/sign-out" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50 active:translate-y-px transition-[border-color,background-color,transform] duration-150"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-gray-400" />
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required = false,
  maxLength,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1 block">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/10 transition-colors"
      />
    </label>
  );
}
