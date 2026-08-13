import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3">
      <span className="text-sm font-semibold">{selectedCount} selected</span>
      <div className="h-4 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="touch" className="gap-1.5 sm:h-9" disabled={!!busy}>
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
          <Button type="button" variant="outline" size="touch" className="gap-1.5 sm:h-9" disabled={!!busy}>
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
          <Button type="button" variant="outline" size="touch" className="gap-1.5 sm:h-9" disabled={!!busy}>
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
          type="button"
          variant="destructive"
          size="touch"
          className="ml-auto gap-1.5 sm:h-9"
          disabled={!!busy}
          onClick={() => setConfirmOpen(true)}
        >
          {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </Button>
      )}
      <Button type="button" variant="ghost" size="touch" className="gap-1.5 sm:h-9" onClick={onClear} disabled={!!busy}>
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>

    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {selectedCount} customer{selectedCount > 1 ? "s" : ""}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the selected customer{selectedCount > 1 ? "s" : ""}. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={Boolean(busy)}
            onClick={async (event) => {
              event.preventDefault();
              await run("delete", onDelete);
              setConfirmOpen(false);
            }}
          >
            {busy === "delete" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {busy === "delete" ? "Deleting customers..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
