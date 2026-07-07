import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarDays, ListChecks, Zap, LogOut, Menu, X, UserCircle, MessageSquare, Contact, ShoppingBag, Activity, Receipt, Settings, Bike, BadgeDollarSign } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { hasAtLeastRole, roleLabel, roleBadgeClass, hasCapability, CAPABILITIES } from "@/config/roles";
import PartsNavItem from "./PartsNavItem";
import JobsNavItem from "./JobsNavItem";
import MobileTabBar from "./MobileTabBar";


export default function DashboardShell({ user, children }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { data: { business, app } } = usePlatformConfig();

  const isAdmin = hasAtLeastRole(user?.role, "admin");
  const canManageCustomers = hasAtLeastRole(user?.role, "technician");
  const canViewLog = hasCapability(user?.role, CAPABILITIES.LOG_VIEW);

  const nav = [
  { to: "/dashboard", label: app.dashboard.nav.overview, icon: LayoutDashboard },
  { to: "/dashboard/calendar", label: app.dashboard.nav.calendar, icon: CalendarDays },
  { to: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  ...(canManageCustomers ? [
  { to: "/admin/clients", label: "Customers", icon: Contact, children: [
  { to: "/asset-management", label: "Asset Management", icon: Bike }] }] :
  []),
  { to: "/settings", label: "Settings", icon: Settings, children: [
  { to: "/service-pricing", label: "Service Pricing", icon: BadgeDollarSign }] }];

  const adminNav = [
  ...(canViewLog ? [{ to: "/admin/activity", label: "Activity Log", icon: Activity }] : []),
  ...(isAdmin ? [
  { to: "/admin/feedback", label: "Feedback", icon: MessageSquare }] :
  [])];

  const Sidebar = () =>
  <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2 px-5 h-16 border-b border-border hover:bg-secondary/40 transition-colors">
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-accent/15 text-accent"><Zap className="h-5 w-5" /></span>
        <div>
          <p className="font-heading font-extrabold text-sm leading-tight">{business.name}</p>
          <p className="text-[11px] text-muted-foreground">{app.terminology.platformLabel}</p>
        </div>
      </Link>
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        {nav.map((n, idx) => {
        const active = pathname === n.to;
        return (
          <React.Fragment key={n.to}>
              <Link to={n.to} onClick={() => setOpen(false)}
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary")}>
                <n.icon className="h-4.5 w-4.5" /> {n.label}
              </Link>
              {n.children?.map((c) => (
                <Link key={c.to} to={c.to} onClick={() => setOpen(false)}
                className={cn("flex items-center gap-3 rounded-xl py-2 pl-9 pr-3 text-[13px] font-medium transition-colors",
                pathname === c.to ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary")}>
                  <c.icon className="h-4 w-4" /> {c.label}
                </Link>
              ))}
              {idx === 0 && <JobsNavItem label={app.dashboard.nav.jobs} onNavigate={() => setOpen(false)} />}
            </React.Fragment>);

      })}
        {isAdmin && <PartsNavItem onNavigate={() => setOpen(false)} />}
        {adminNav.map((n) => {
        const active = pathname === n.to;
        return (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
          className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>
              <n.icon className="h-4.5 w-4.5" /> {n.label}
            </Link>);

      })}
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user?.full_name || "User"}</p>
            <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", roleBadgeClass(user?.role))}>
              {roleLabel(user?.role)}
            </span>
          </div>
        </div>
        <button onClick={() => base44.auth.logout()}
      className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-card/95 backdrop-blur-xl border-r border-border z-30"><Sidebar /></aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-card border-b border-border">
        <button onClick={() => setOpen(true)} className="-ml-2 p-2" aria-label="Open menu"><Menu className="h-6 w-6" /></button>
        <span className="font-heading font-bold">{business.name}</span>
        <span className="w-6" />
      </div>
      {open &&
      <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card"><Sidebar /></div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)}>
            <button className="m-4 text-white"><X className="h-6 w-6" /></button>
          </div>
        </div>
      }

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8">{children}</div>
      </main>

      <MobileTabBar onMore={() => setOpen(true)} />
    </div>);

}