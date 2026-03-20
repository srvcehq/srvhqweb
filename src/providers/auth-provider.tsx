"use client";

import React, { createContext, useContext } from "react";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "employee";
};

type AuthContextValue = {
  user: User;
  isAuthenticated: true;
  isLoading: false;
  logout: () => void;
};

const mockUser: User = {
  id: "1",
  email: "jake@greenvalley.com",
  full_name: "Jake Morrison",
  role: "admin",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const logout = () => {
    // Mock logout - in production this would clear session and redirect
    console.log("Logout called");
  };

  return (
    <AuthContext.Provider
      value={{
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
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
