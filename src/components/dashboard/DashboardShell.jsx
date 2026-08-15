import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  BadgeDollarSign,
  Bike,
  CalendarDays,
  ChevronDown,
  Contact,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Settings,
  UserCircle,
  Zap,
} from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import {
  CAPABILITIES,
  hasAtLeastRole,
  hasCapability,
  roleBadgeClass,
  roleLabel,
} from "@/config/roles";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import PartsNavItem from "./PartsNavItem";
import MobileTabBar from "./MobileTabBar";

/** @param {string} pathname @param {string} to @param {boolean} [exact] */
function isPathActive(pathname, to, exact = false) {
  return exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * @param {{ to: string, label: string, icon: React.ComponentType<{ className?: string }>, active: boolean, onNavigate: () => void, nested?: boolean }} props
 */
function SidebarLink({ to, label, icon: Icon, active, onNavigate, nested = false }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        nested && "ml-4 min-h-10 border-l border-border pl-5 text-[13px]",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className={nested ? "h-4 w-4" : "h-[18px] w-[18px]"} aria-hidden="true" />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

/**
 * @param {{ label: string, icon: React.ComponentType<{ className?: string }>, active: boolean, children: React.ReactNode }} props
 */
function SidebarGroup({ label, icon: Icon, active, children }) {
  const [expanded, setExpanded] = useState(active);

  useEffect(() => {
    if (active) setExpanded(true);
  }, [active]);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors",
            active
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** @param {{ user?: Record<string, any>, children: React.ReactNode }} props */
export default function DashboardShell({ user, children }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data: { business, app } } = usePlatformConfig();

  const isAdmin = hasAtLeastRole(user?.role, "admin");
  const canManageCustomers = isAdmin;
  const canViewLog = hasCapability(user?.role, CAPABILITIES.LOG_VIEW);
  const closeNavigation = () => setOpen(false);

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-card">
      <Link
        to="/"
        onClick={closeNavigation}
        className="flex h-16 items-center gap-2 border-b border-border px-5 transition-colors hover:bg-secondary/40"
      >
        <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/15 text-accent">
          <Zap className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-extrabold leading-tight">{business.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{app.terminology.platformLabel}</p>
        </div>
      </Link>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="Staff navigation">
        <SidebarLink
          to="/dashboard"
          label={app.dashboard.nav.overview}
          icon={LayoutDashboard}
          active={isPathActive(pathname, "/dashboard", true)}
          onNavigate={closeNavigation}
        />
        <SidebarLink
          to="/dashboard/jobs"
          label={app.dashboard.nav.jobs}
          icon={ListChecks}
          active={isPathActive(pathname, "/dashboard/jobs")}
          onNavigate={closeNavigation}
        />
        <SidebarLink
          to="/dashboard/calendar"
          label={app.dashboard.nav.calendar}
          icon={CalendarDays}
          active={isPathActive(pathname, "/dashboard/calendar")}
          onNavigate={closeNavigation}
        />
        <SidebarLink
          to="/dashboard/invoices"
          label="Invoices"
          icon={Receipt}
          active={isPathActive(pathname, "/dashboard/invoices")}
          onNavigate={closeNavigation}
        />

        {isAdmin && <PartsNavItem onNavigate={closeNavigation} />}

        {canManageCustomers && (
          <SidebarGroup
            label="Customers"
            icon={Contact}
            active={isPathActive(pathname, "/admin/clients") || isPathActive(pathname, "/asset-management")}
          >
            <SidebarLink
              to="/admin/clients"
              label="Customer list"
              icon={Contact}
              active={isPathActive(pathname, "/admin/clients")}
              onNavigate={closeNavigation}
              nested
            />
            <SidebarLink
              to="/asset-management"
              label="Asset management"
              icon={Bike}
              active={isPathActive(pathname, "/asset-management")}
              onNavigate={closeNavigation}
              nested
            />
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup
            label="News and events"
            icon={FileText}
            active={isPathActive(pathname, "/dashboard/blog")}
          >
            <SidebarLink to="/dashboard/blog" label="Overview" icon={FileText} active={pathname === "/dashboard/blog"} onNavigate={closeNavigation} nested />
            <SidebarLink to="/dashboard/blog/posts" label="Articles" icon={FileText} active={isPathActive(pathname, "/dashboard/blog/posts")} onNavigate={closeNavigation} nested />
            <SidebarLink to="/dashboard/blog/generate" label="AI generator" icon={Zap} active={isPathActive(pathname, "/dashboard/blog/generate")} onNavigate={closeNavigation} nested />
            <SidebarLink to="/dashboard/blog/taxonomy" label="Categories and tags" icon={ListChecks} active={isPathActive(pathname, "/dashboard/blog/taxonomy")} onNavigate={closeNavigation} nested />
            <SidebarLink to="/dashboard/blog/settings" label="News settings" icon={Settings} active={isPathActive(pathname, "/dashboard/blog/settings")} onNavigate={closeNavigation} nested />
            <SidebarLink to="/dashboard/blog/logs" label="News logs" icon={Activity} active={isPathActive(pathname, "/dashboard/blog/logs")} onNavigate={closeNavigation} nested />
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup
            label="Settings"
            icon={Settings}
            active={pathname === "/settings" || isPathActive(pathname, "/settings/service-pricing") || isPathActive(pathname, "/settings/system-health")}
          >
            <SidebarLink to="/settings" label="General settings" icon={Settings} active={pathname === "/settings"} onNavigate={closeNavigation} nested />
            <SidebarLink to="/settings/service-pricing" label="Service pricing" icon={BadgeDollarSign} active={isPathActive(pathname, "/settings/service-pricing")} onNavigate={closeNavigation} nested />
            <SidebarLink to="/settings/system-health" label="System health" icon={Activity} active={isPathActive(pathname, "/settings/system-health")} onNavigate={closeNavigation} nested />
          </SidebarGroup>
        )}

        {canViewLog && (
          <SidebarLink to="/admin/activity" label="Activity log" icon={Activity} active={isPathActive(pathname, "/admin/activity")} onNavigate={closeNavigation} />
        )}
        {isAdmin && (
          <SidebarLink to="/admin/feedback" label="Feedback" icon={MessageSquare} active={isPathActive(pathname, "/admin/feedback")} onNavigate={closeNavigation} />
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <UserCircle className="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.full_name || "User"}</p>
            <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", roleBadgeClass(user?.role))}>
              {roleLabel(user?.role)}
            </span>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="touch"
          onClick={() => base44.auth.logout()}
          className="mt-1 w-full justify-start text-muted-foreground"
        >
          <LogOut aria-hidden="true" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card/95 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-3 lg:hidden">
        <Button type="button" variant="ghost" size="iconTouch" onClick={() => setOpen(true)} aria-label="Open staff navigation">
          <Menu className="h-6 w-6" aria-hidden="true" />
        </Button>
        <span className="min-w-0 truncate px-2 font-heading font-bold">{business.name}</span>
        <span className="h-11 w-11" aria-hidden="true" />
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[18rem] max-w-[88vw] p-0 sm:max-w-[18rem]">
          <SheetTitle className="sr-only">Staff navigation</SheetTitle>
          <SheetDescription className="sr-only">Navigate between staff tools and account controls.</SheetDescription>
          <Sidebar />
        </SheetContent>
      </Sheet>

      <main id="main-content" tabIndex={-1} className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8">{children}</div>
      </main>

      <MobileTabBar onMore={() => setOpen(true)} />
    </div>
  );
}
