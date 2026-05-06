"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface LoginFormProps {
  devMode: boolean;
  nextPath: string | null;
  errorMessage: string | null;
}

export default function LoginForm({
  devMode,
  nextPath,
  errorMessage,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDevSigning, setIsDevSigning] = useState(false);
  const [error, setError] = useState<string | null>(errorMessage);

  const safeNext = nextPath && nextPath.startsWith("/") ? nextPath : "/";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDevLogin() {
    setIsDevSigning(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev-login", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Dev sign-in failed");
        return;
      }
      // Force the browser client to pick up the new cookie session
      router.push(safeNext);
      router.refresh();
      toast.success("Signed in as Dev Admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dev sign-in failed");
    } finally {
      setIsDevSigning(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
            disabled={isSubmitting}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium shadow-md"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {devMode && (
        <>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-card px-2 text-muted-foreground">
                Dev mode
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleDevLogin}
            disabled={isDevSigning}
            className="w-full border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400"
          >
            {isDevSigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Sign in as Dev Admin
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Disabled automatically in production builds.
          </p>
        </>
      )}
    </div>
  );
}
