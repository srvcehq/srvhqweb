"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Wrench,
  FileText,
  FolderKanban,
  User,
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PortalShellProps {
  children: React.ReactNode;
  contactName: string | null;
  contactEmail: string | null;
  companyName: string;
}

const NAV = [
  { name: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { name: "Payments", href: "/portal/payments", icon: CreditCard },
  { name: "Maintenance", href: "/portal/maintenance", icon: Wrench },
  { name: "Proposals", href: "/portal/proposals", icon: FileText },
  { name: "My Projects", href: "/portal/projects", icon: FolderKanban },
  { name: "Profile", href: "/portal/profile", icon: User },
] as const;

function getInitials(name: string | null): string {
  if (!name) return "C";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PortalShell({
  children,
  contactName,
  contactEmail,
  companyName,
}: PortalShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1B4332] flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {companyName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-gray-900 text-sm">{companyName}</span>
            <span className="text-[10px] text-gray-500">Client Portal</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center shadow-lg shadow-[#1B4332]/20">
                <span className="text-white font-bold text-lg">
                  {companyName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 tracking-tight">{companyName}</h1>
                <p className="text-xs text-gray-500">Client Portal</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#1B4332] text-white shadow-lg shadow-[#1B4332]/20"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-gray-600"
                    }`}
                  />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                <AvatarFallback className="bg-[#1B4332] text-white text-sm font-medium">
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {contactName ?? "Client"}
                </p>
                {contactEmail ? (
                  <p className="text-xs text-gray-500 truncate">{contactEmail}</p>
                ) : null}
              </div>
              <form action="/api/portal/sign-out" method="post">
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-gray-400 hover:text-gray-600"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
