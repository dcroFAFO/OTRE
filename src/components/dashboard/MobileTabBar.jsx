import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ListChecks, CalendarDays, Receipt, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/jobs", label: "Jobs", icon: ListChecks },
  { to: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/dashboard/invoices", label: "Invoices", icon: Receipt },
];

// Mobile-only bottom tab bar for the staff dashboard. "More" opens the full
// slide-out navigation so no existing nav options are lost.
export default function MobileTabBar({ onMore }) {
  const { pathname } = useLocation();
  const moreActive = !TABS.some((tab) => tab.exact ? pathname === tab.to : pathname.startsWith(tab.to));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-safe" aria-label="Dashboard navigation">
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                active ? "text-accent" : "text-muted-foreground"
              )}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onMore}
          aria-pressed={moreActive}
          className={cn("flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium", moreActive ? "text-accent" : "text-muted-foreground")}
          aria-label="More navigation options"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>
    </nav>
  );
}
