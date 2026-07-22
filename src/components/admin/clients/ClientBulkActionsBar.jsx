import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CLIENT_STATUSES, CLIENT_TAGS } from "@/config/clientConfig";
import { Loader2, Minus, Tag, Trash2, UserCog, X } from "lucide-react";

export default function ClientBulkActionsBar({
  selectedCount,
  onStatusChange,
  onAddTag,
  onRemoveTag,
  onDelete,
  onClear,
  canDelete,
}) {
  const [busy, setBusy] = useState(null);

  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3">
      <span className="text-sm font-semibold">{selectedCount} selected</span>
      <div className="h-4 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!busy}>
            <UserCog className="h-3.5 w-3.5" /> Set status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {CLIENT_STATUSES.map((s) => (
            <DropdownMenuItem key={s.key} onClick={() => run("status", () => onStatusChange(s.key))}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!busy}>
            <Tag className="h-3.5 w-3.5" /> Add tag
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {CLIENT_TAGS.map((t) => (
            <DropdownMenuItem key={t.key} onClick={() => run("addTag", () => onAddTag(t.key))}>
              {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={!!busy}>
            <Minus className="h-3.5 w-3.5" /> Remove tag
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {CLIENT_TAGS.map((t) => (
            <DropdownMenuItem key={t.key} onClick={() => run("removeTag", () => onRemoveTag(t.key))}>
              {t.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {canDelete && (
        <Button
          variant="destructive"
          size="sm"
          className="gap-1.5 ml-auto"
          disabled={!!busy}
          onClick={() => run("delete", onDelete)}
        >
          {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </Button>
      )}
      <Button variant="ghost" size="sm" className="gap-1.5" onClick={onClear} disabled={!!busy}>
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
}