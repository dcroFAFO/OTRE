import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ListChecks, ChevronRight } from "lucide-react";
import { ALL_JOB_GROUPS } from "@/config/jobGroups";
import { cn } from "@/lib/utils";

// Jobs nav link that expands to reveal job status groups.
export default function JobsNavItem({ label = "Jobs", onNavigate }) {
  const { pathname, search } = useLocation();
  const onJobs = pathname === "/dashboard/jobs";
  const [expanded, setExpanded] = useState(onJobs);
  const activeGroup = new URLSearchParams(search).get("group") || "all";

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          onJobs ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
        )}
      >
        <ListChecks className="h-4.5 w-4.5" /> {label}
        <ChevronRight className={cn("h-4 w-4 ml-auto transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
          {ALL_JOB_GROUPS.map((g) => (
            <GroupLink
              key={g.key}
              to={g.key === "all" ? "/dashboard/jobs" : `/dashboard/jobs?group=${g.key}`}
              label={g.label}
              active={onJobs && activeGroup === g.key}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupLink({ to, label, active, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "block rounded-lg px-3 py-1.5 text-sm transition-colors truncate",
        active ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:bg-secondary/60"
      )}
    >
      {label}
    </Link>
  );
}