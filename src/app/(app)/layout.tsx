"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { useAuth } from "@/providers/auth-provider";
import {
  useEmployeeViewMode,
  PERMISSIONS,
} from "@/providers/employee-view-provider";
import { useCompany } from "@/providers/company-provider";

import {
  LayoutDashboard,
  Users,
  FileText,
  FolderKanban,
  Settings,
  Sprout,
  Menu,
  LogOut,
  DollarSign,
  Calendar,
  Wrench,
  PieChart,
  MessageSquare,
  DoorOpen,
  Map,
  ClipboardList,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
};

const allNavigationItems: NavItem[] = [
  {
    title: "Dashboard",
    url: routes.dashboard,
    icon: LayoutDashboard,
    permission: PERMISSIONS.VIEW_SCHEDULE,
  },
  {
    title: "Schedule",
    url: routes.schedule,
    icon: Calendar,
    permission: PERMISSIONS.VIEW_SCHEDULE,
  },
  {
    title: "Route Assignments",
    url: routes.routeAssignments,
    icon: Map,
    permission: PERMISSIONS.VIEW_SCHEDULE,
  },
  {
    title: "Contacts",
    url: routes.contacts,
    icon: Users,
    permission: PERMISSIONS.VIEW_CONTACTS,
  },
  {
    title: "Client Map",
    url: routes.clientMap,
    icon: Users,
    permission: PERMISSIONS.VIEW_CLIENT_MAP,
  },
  {
    title: "Projects",
    url: routes.projects,
    icon: FolderKanban,
    permission: PERMISSIONS.VIEW_PROJECTS,
  },
  {
    title: "Maintenance Items",
    url: routes.maintenanceItems,
    icon: Wrench,
    permission: PERMISSIONS.VIEW_MAINTENANCE_ITEMS,
  },
  {
    title: "Maintenance Plans",
    url: routes.maintenancePlans,
    icon: ClipboardList,
    permission: PERMISSIONS.VIEW_MAINTENANCE_PLANS,
  },
  {
    title: "Bid Items",
    url: routes.bidItems,
    icon: Sprout,
    permission: PERMISSIONS.VIEW_BID_ITEMS,
  },
  {
    title: "Bids",
    url: routes.bids,
    icon: FileText,
    permission: PERMISSIONS.VIEW_BIDS,
  },
  {
    title: "Door to Door",
    url: routes.doorToDoor,
    icon: DoorOpen,
    permission: PERMISSIONS.VIEW_DOOR_TO_DOOR,
  },
  {
    title: "Hard Costs",
    url: routes.hardCosts,
    icon: DollarSign,
    permission: PERMISSIONS.PRICING_PLANS,
  },
  {
    title: "Payments",
    url: routes.payments,
    icon: DollarSign,
    permission: PERMISSIONS.PAYMENTS,
  },
  {
    title: "Communications",
    url: routes.communications,
    icon: MessageSquare,
    permission: PERMISSIONS.VIEW_CONTACTS,
  },
  {
    title: "Financials",
    url: routes.financials,
    icon: PieChart,
    permission: PERMISSIONS.FINANCIALS,
  },
  {
    title: "Settings",
    url: routes.settings,
    icon: Settings,
    permission: PERMISSIONS.COMPANY_SETTINGS,
  },
];

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    isEmployeeViewMode,
    employeeViewName,
    employeeViewRole,
    exitEmployeeViewMode,
    hasPermission,
  } = useEmployeeViewMode();
  const { open, setOpen, isMobile } = useSidebar();
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter navigation based on role permissions in testing mode
  const navigationItems = useMemo(() => {
    if (!isEmployeeViewMode) return allNavigationItems;
    return allNavigationItems.filter((item) => {
      return item.permission ? hasPermission(item.permission) : true;
    });
  }, [isEmployeeViewMode, hasPermission]);

  // Route guarding for testing view mode
  useEffect(() => {
    if (isEmployeeViewMode) {
      const currentPath = pathname.toLowerCase();
      const matchingItem = allNavigationItems.find((item) => {
        const itemPath = item.url.toLowerCase();
        return (
          currentPath === itemPath || currentPath.startsWith(itemPath + "/")
        );
      });

      if (matchingItem?.permission && !hasPermission(matchingItem.permission)) {
        router.push(routes.dashboard);
      }
    }
  }, [isEmployeeViewMode, pathname, router, hasPermission]);

  // Handle hover behavior on desktop only
  const handleSidebarMouseEnter = () => {
    if (isMobile) return;

    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      setOpen(true);
    }, 150);
  };

  const handleSidebarMouseLeave = () => {
    if (isMobile) return;

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    leaveTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
      setOpen(false);
    }, 300);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleExitEmployeeView = () => {
    exitEmployeeViewMode();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-app-bg-from via-app-bg-via to-app-bg-to relative">
        {/* Persistent Employee View Mode Banner */}
        {isEmployeeViewMode && (
          <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-4">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg shadow-2xl p-3 pr-2 flex items-center gap-3 border-2 border-amber-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-300 inline-block" />
                <div className="text-sm">
                  <div className="font-semibold">
                    Viewing as {employeeViewName}
                  </div>
                  <div className="text-amber-100 text-xs">
                    {employeeViewRole === "admin"
                      ? "Admin"
                      : employeeViewRole === "manager"
                        ? "Manager"
                        : "Employee"}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExitEmployeeView}
                className="text-white hover:bg-white/20 h-8 px-3"
              >
                <X className="w-4 h-4 mr-1" />
                Exit
              </Button>
            </div>
          </div>
        )}

        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border-green bg-sidebar-bg backdrop-blur-sm"
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
        >
          <SidebarHeader className="border-b border-sidebar-border-green p-6 group-data-[collapsible=icon]:p-4">
            <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <h2 className="font-bold text-foreground text-lg whitespace-nowrap overflow-hidden text-ellipsis">
                  TerraFlow
                </h2>
                <p className="text-xs text-green-600 whitespace-nowrap overflow-hidden text-ellipsis">
                  Business Management
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 group-data-[collapsible=icon]:hidden">
                Main Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <React.Fragment key={item.title}>
                      {item.title === "Hard Costs" && (
                        <div className="my-3 px-3 group-data-[collapsible=icon]:px-0">
                          <div className="border-t border-border" />
                        </div>
                      )}
                      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              asChild
                              className={`rounded-xl group-data-[collapsible=icon]:rounded-full transition-all duration-200 mb-1 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:h-11 ${
                                pathname === item.url
                                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                                  : "hover:bg-accent text-muted-foreground"
                              }`}
                            >
                              <Link
                                href={item.url}
                                className="flex items-center gap-3 px-4 py-3 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:h-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0"
                              >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                <span className="font-medium group-data-[collapsible=icon]:hidden">
                                  {item.title}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="group-data-[collapsible=icon]:flex hidden"
                          >
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    </React.Fragment>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border-green p-4">
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="font-medium text-foreground text-sm truncate">
                    {user?.full_name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.role || "Member"}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="hover:bg-red-50 hover:text-red-600 group-data-[collapsible=icon]:hidden"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="bg-header-bg backdrop-blur-sm border-b border-sidebar-border-green px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-accent p-2 rounded-lg transition-colors duration-200 -ml-2">
                  <Menu className="w-5 h-5" />
                </SidebarTrigger>
                <h1 className="text-xl font-bold text-foreground md:hidden">
                  TerraFlow
                </h1>
              </div>
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="max-w-full">{children}</div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}
