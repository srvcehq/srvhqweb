import Link from "next/link";
import { publicEnv } from "@/lib/env";
import { BrandMark } from "@/components/brand/brand-logo";
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 mb-4 dark:bg-zinc-100">
          <BrandMark size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome to SRVCE HQ
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
