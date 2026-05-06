import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portal",
  description: "View your projects, bids, and payments.",
};

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The portal is a separate, light-themed surface for homeowners — distinct
  // from the contractor admin app. We force a light theme on this subtree so
  // it can never accidentally inherit the contractor app's dark styling.
  return (
    <div className="portal-root bg-gray-50 text-gray-900 min-h-screen">
      {children}
    </div>
  );
}
