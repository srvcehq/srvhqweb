import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to TerraFlow",
  description: "Let's get your account set up.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
