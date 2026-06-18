import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export default function JobsNavItem({ label = "Jobs", onNavigate }) {
  const { pathname } = useLocation();
  const onJobs = pathname === "/dashboard/jobs";

  return (
    <Link
      to="/dashboard/jobs"
      onClick={onNavigate}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        onJobs ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
      )}
    >
      <ListChecks className="h-4.5 w-4.5" /> {label}
    </Link>
  );
}