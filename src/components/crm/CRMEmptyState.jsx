import React from "react";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export default function CRMEmptyState({ icon: Icon = Inbox, title, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground mb-4">
        <Icon className="h-7 w-7" />
      </span>
      <h3 className="font-heading font-bold text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{message}</p>
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}