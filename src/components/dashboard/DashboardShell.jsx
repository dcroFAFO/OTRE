import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, ListChecks, Zap, LogOut, Menu, X, UserCircle, Kanban, Package, FileText, Sparkles, Users, Building2, Bell, MessageSquare, Contact } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { ROLES } from "@/config/jobConfig";
import { crmHasAccess } from "@/config/crmConfig";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";


export default function DashboardShell({ user, children }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data: { business, app } } = usePlatformConfig();
  const nav = [
    { to: "/dashboard", label: app.dashboard.nav.overview, icon: LayoutDashboard },
    { to: "/dashboard/jobs", label: app.dashboard.nav.jobs, icon: ListChecks },
    { to: "/dashboard/calendar", label: app.dashboard.nav.calendar, icon: CalendarDays },
    { to: "/dashboard/inventory", label: "Inventory", icon: Package },
    { to: "/dashboard/templates", label: "Templates", icon: FileText },
    ...(user?.role === "admin" ? [
      { to: "/admin/clients", label: "Clients", icon: Contact },
      { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
    ] : []),
  ];

  const crmNav = [
    { to: "/dashboard/crm/leads", label: "Leads", icon: Sparkles },
    { to: "/dashboard/crm/contacts", label: "Contacts", icon: Users },
    { to: "/dashboard/crm/companies", label: "Companies", icon: Building2 },
  ];
  const showCRM = crmHasAccess(user?.role);

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-border">
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground"><Zap className="h-5 w-5 text-accent" /></span>
        <div>
          <p className="font-heading font-extrabold text-sm leading-tight">{business.name}</p>
          <p className="text-[11px] text-muted-foreground">{app.terminology.platformLabel}</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((n) => {
          const active = pathname === n.to;
          return (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
              <n.icon className="h-4.5 w-4.5" /> {n.label}
            </Link>
          );
        })}

        {showCRM && (
          <>
            <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">CRM</p>
            {crmNav.map((n) => {
              const active = pathname === n.to;
              return (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                  className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
                  <n.icon className="h-4.5 w-4.5" /> {n.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.full_name || "User"}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{ROLES[user?.role]?.label || user?.role}</p>
          </div>
        </div>
        <button onClick={() => base44.auth.logout(window.location.origin)}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-30"><Sidebar /></aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-card border-b border-border">
        <button onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
        <span className="font-heading font-bold">{business.name}</span>
        <span className="w-6" />
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card"><Sidebar /></div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)}>
            <button className="m-4 text-white"><X className="h-6 w-6" /></button>
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}