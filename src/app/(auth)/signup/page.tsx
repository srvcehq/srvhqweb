import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-logo";
import SignupForm from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col items-center mb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 mb-4 dark:bg-zinc-100">
          <BrandMark size={32} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Create your SRVCE HQ account
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll walk you through setup right after.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-lg p-6">
        <SignupForm />
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-green-700 hover:text-green-800 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
