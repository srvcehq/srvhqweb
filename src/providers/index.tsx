"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { CompanyProvider } from "./company-provider";
import { EmployeeViewModeProvider } from "./employee-view-provider";
import { TopProgressBar } from "@/components/shared/top-progress-bar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <AuthProvider>
          <CompanyProvider>
            <EmployeeViewModeProvider>
              <TopProgressBar />
              {children}
            </EmployeeViewModeProvider>
          </CompanyProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
