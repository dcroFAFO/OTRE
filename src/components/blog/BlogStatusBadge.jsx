import React from "react";
import { Badge } from "@/components/ui/badge";

const classes = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  scheduled: "bg-amber-100 text-amber-800 border-amber-200",
  published: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archived: "bg-zinc-100 text-zinc-500 border-zinc-200"
};

export default function BlogStatusBadge({ status }) {
  return <Badge variant="outline" className={classes[status] || classes.draft}>{status || "draft"}</Badge>;
}