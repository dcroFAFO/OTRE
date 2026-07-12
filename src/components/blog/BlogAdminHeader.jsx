import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function BlogAdminHeader({ title, description, actionTo = undefined, actionLabel = undefined }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actionTo && <Button asChild><Link to={actionTo}>{actionLabel}</Link></Button>}
    </div>
  );
}
