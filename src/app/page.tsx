import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Anyone reaching "/" has already passed the auth + onboarding + billing gate
// in middleware (no company -> /onboarding, no active sub -> /billing/locked),
// so just send them to the dashboard.
export default function Home() {
  redirect("/dashboard");
}
