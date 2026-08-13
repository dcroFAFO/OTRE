import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * @param {{ id: string, label: string, children: React.ReactElement, hint?: string, error?: string, required?: boolean, className?: string }} props
 */
export default function FieldShell({ id, label, children, hint, error, required = false, className }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [children.props?.["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = React.cloneElement(children, {
    id: children.props?.id || id,
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {control}
      {hint && <p id={hintId} className="text-xs leading-5 text-muted-foreground">{hint}</p>}
      {error && <p id={errorId} className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

