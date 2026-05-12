"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Company = {
  name: string | null;
};

type CompanyContextValue = {
  /**
   * The signed-in user's company id. Empty string until it loads (or if they
   * have no company yet) — callers gate queries with `enabled: !!currentCompanyId`.
   */
  currentCompanyId: string;
  currentCompany: Company | null;
  isLoading: boolean;
  error: string | null;
  refreshCompany: () => void;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [currentCompanyId, setCurrentCompanyId] = useState<string>("");
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: membership, error: mErr } = await supabase
        .from("company_memberships")
        .select("company_id")
        .maybeSingle();
      if (mErr) throw mErr;
      const companyId =
        (membership as { company_id?: string } | null)?.company_id ?? "";
      setCurrentCompanyId(companyId);
      if (companyId) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("company_name")
          .eq("id", companyId)
          .maybeSingle();
        setCurrentCompany({
          name: (settings as { company_name?: string } | null)?.company_name ?? null,
        });
      } else {
        setCurrentCompany(null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load company");
      setCurrentCompanyId("");
      setCurrentCompany(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshCompany = useCallback(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  return (
    <CompanyContext.Provider
      value={{ currentCompanyId, currentCompany, isLoading, error, refreshCompany }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
