import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TerraFlow — Sign in",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-app-bg-from via-app-bg-via to-app-bg-to p-4">
      {children}
    </div>
  );
}
