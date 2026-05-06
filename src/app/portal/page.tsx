import { redirect } from "next/navigation";
import { AlertCircle, Mail } from "lucide-react";
import { getPortalSession } from "@/lib/portal-session";

interface PageProps {
  searchParams: Promise<{
    reason?: string;
    signed_out?: string;
  }>;
}

export default async function PortalRootPage({ searchParams }: PageProps) {
  const { reason, signed_out } = await searchParams;

  // Already signed in? Skip the landing screen.
  const session = await getPortalSession();
  if (session && !signed_out && !reason) {
    redirect("/portal/dashboard");
  }

  if (signed_out) {
    return (
      <FallbackCard
        title="You've been signed out"
        message="Use the link from your most recent invite or login text to come back in."
        variant="info"
      />
    );
  }

  if (reason === "expired") {
    return (
      <FallbackCard
        title="That link has expired"
        message="Please ask your contractor to send a fresh portal link."
        variant="error"
      />
    );
  }

  if (reason === "invalid" || reason === "no_token") {
    return (
      <FallbackCard
        title="That link is no longer valid"
        message="Please ask your contractor to send you a new invite or login link."
        variant="error"
      />
    );
  }

  return (
    <FallbackCard
      title="Use your invite link"
      message="This portal is accessed through a one-tap link your contractor sends by text or email. If you can't find it, ask them to resend."
      variant="info"
    />
  );
}

function FallbackCard({
  title,
  message,
  variant,
}: {
  title: string;
  message: string;
  variant: "info" | "error";
}) {
  const Icon = variant === "error" ? AlertCircle : Mail;
  const iconClass = variant === "error" ? "text-red-600" : "text-[#1B4332]";
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <Icon className={`w-12 h-12 ${iconClass} mx-auto mb-4`} />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}
