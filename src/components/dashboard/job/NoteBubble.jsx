import React from "react";
import { Lock, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { roleLabel, roleBadgeClass } from "@/config/roles";
import { cn } from "@/lib/utils";

function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function NoteBubble({ note }) {
  const isCustomer = note.visibility === "customer";
  const when = note.created_date
    ? formatDistanceToNow(new Date(note.created_date), { addSuffix: true })
    : "";

  return (
    <div className="flex gap-2.5">
      <div className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
        isCustomer ? "bg-accent/15 text-accent" : "bg-secondary text-secondary-foreground"
      )}>
        {initials(note.author_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{note.author_name || "System"}</span>
          {note.author_role && note.author_role !== "system" && (
            <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", roleBadgeClass(note.author_role))}>
              {roleLabel(note.author_role)}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">· {when}</span>
        </div>
        <div className={cn(
          "mt-1 rounded-2xl rounded-tl-sm border px-3 py-2",
          isCustomer ? "border-accent/30 bg-accent/5" : "border-border bg-secondary/40"
        )}>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{note.body}</p>
        </div>
        <span className={cn(
          "mt-1 inline-flex items-center gap-1 text-[10px] font-medium",
          isCustomer ? "text-accent" : "text-muted-foreground"
        )}>
          {isCustomer ? <><Eye className="h-3 w-3" /> Customer-visible</> : <><Lock className="h-3 w-3" /> Internal</>}
        </span>
      </div>
    </div>
  );
}