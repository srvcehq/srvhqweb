"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Role = "admin" | "manager" | "employee";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function deriveFullName(meta: Record<string, unknown> | undefined, email: string): string {
  const first = meta?.["first_name"];
  const last = meta?.["last_name"];
  if (typeof first === "string" || typeof last === "string") {
    const combined = `${first ?? ""} ${last ?? ""}`.trim();
    if (combined) return combined;
  }
  const display = meta?.["full_name"];
  if (typeof display === "string" && display.trim()) return display;
  return email.split("@")[0] ?? "User";
}

function deriveRole(meta: Record<string, unknown> | undefined): Role {
  const r = meta?.["role"];
  if (r === "admin" || r === "manager" || r === "employee") return r;
  // Default — until we wire `employees.user_id` joins, every authenticated
  // user gets admin. Multi-tenant rollout will tighten this.
  return "admin";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email ?? "",
          full_name: deriveFullName(authUser.user_metadata, authUser.email ?? ""),
          role: deriveRole(authUser.user_metadata),
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          full_name: deriveFullName(
            session.user.user_metadata,
            session.user.email ?? ""
          ),
          role: deriveRole(session.user.user_metadata),
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
