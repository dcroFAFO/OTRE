import React from "react";

export default function CRMPageHeader({ title, subtitle, icon: Icon, count, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Icon className="h-5 w-5 text-accent" />
          </span>
        )}
        <div>
          <h1 className="font-heading text-2xl font-extrabold flex items-center gap-2">
            {title}
            {count != null && <span className="text-base font-semibold text-muted-foreground tabular-nums">({count})</span>}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}