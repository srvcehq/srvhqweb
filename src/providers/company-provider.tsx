"use client";

import React, { createContext, useContext } from "react";

type Company = {
  name: string;
};

type CompanyContextValue = {
  currentCompanyId: string;
  currentCompany: Company;
  isLoading: false;
  error: null;
  refreshCompany: () => void;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const refreshCompany = () => {
    // Mock refresh - noop for now
  };

  return (
    <CompanyContext.Provider
      value={{
        currentCompanyId: "1",
        currentCompany: { name: "Green Valley Landscaping" },
        isLoading: false,
        error: null,
        refreshCompany,
      }}
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
