import Link from "next/link";
import { Sprout } from "lucide-react";
import { publicEnv } from "@/lib/env";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col items-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20 mb-4">
          <Sprout className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome to TerraFlow
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your business account
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
        <LoginForm
          devMode={publicEnv.NEXT_PUBLIC_AUTH_DEV_MODE}
          nextPath={params.next ?? null}
          errorMessage={params.error ?? null}
        />
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/signup"
          className="font-medium text-green-700 hover:text-green-800 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
