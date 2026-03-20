"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "./query-provider";
import { AuthProvider } from "./auth-provider";
import { CompanyProvider } from "./company-provider";
import { EmployeeViewModeProvider } from "./employee-view-provider";

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
            <EmployeeViewModeProvider>{children}</EmployeeViewModeProvider>
          </CompanyProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
