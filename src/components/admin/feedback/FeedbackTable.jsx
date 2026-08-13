import React from "react";
import { format } from "date-fns";
import { Archive, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "./FeedbackBadges";

/** @param {{ items: Array<Record<string, any>>, onView: (item: Record<string, any>) => void, onResolve: (item: Record<string, any>) => void, onArchive: (item: Record<string, any>) => void, busyId?: string | null }} props */
export default function FeedbackTable({ items, onView, onResolve, onArchive, busyId }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {items.map((item) => <FeedbackCard key={item.id} item={item} onView={onView} onResolve={onResolve} onArchive={onArchive} busyId={busyId} />)}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Submitted feedback and review status</caption>
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Submitted by</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-secondary/30">
                <td className="max-w-[240px] px-4 py-3">
                  <button type="button" onClick={() => onView(item)} className="block w-full truncate text-left font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.subject || "Untitled feedback"}</button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{item.feedback_type || "Other"}</td>
                <td className="px-4 py-3"><PriorityBadge value={item.priority} /></td>
                <td className="px-4 py-3"><StatusBadge value={item.status} /></td>
                <td className="max-w-[160px] px-4 py-3"><p className="truncate">{item.submitted_by_name || "Anonymous"}</p><p className="truncate text-[11px] text-muted-foreground">{item.submitted_by_email}</p></td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(item.created_date)}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-1">
                    <Button type="button" variant="ghost" size="iconTouch" aria-label={`View ${item.subject || "feedback"}`} onClick={() => onView(item)} disabled={Boolean(busyId)}><Eye aria-hidden="true" /></Button>
                    {item.status !== "Resolved" ? <Button type="button" variant="ghost" size="iconTouch" className="text-emerald-700" aria-label={`Mark ${item.subject || "feedback"} resolved`} disabled={Boolean(busyId)} onClick={() => onResolve(item)}>{busyId === item.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</Button> : null}
                    {!item.is_archived ? <Button type="button" variant="ghost" size="iconTouch" aria-label={`Archive ${item.subject || "feedback"}`} disabled={Boolean(busyId)} onClick={() => onArchive(item)}>{busyId === item.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Archive aria-hidden="true" />}</Button> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** @param {{ item: Record<string, any>, onView: (item: Record<string, any>) => void, onResolve: (item: Record<string, any>) => void, onArchive: (item: Record<string, any>) => void, busyId?: string | null }} props */
function FeedbackCard({ item, onView, onResolve, onArchive, busyId }) {
  const busy = Boolean(busyId);
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge value={item.status} /><PriorityBadge value={item.priority} /></div>
      <h2 className="mt-3 line-clamp-2 font-semibold">{item.subject || "Untitled feedback"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{item.feedback_type || "Other"}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Submitted by</dt><dd className="mt-0.5 truncate">{item.submitted_by_name || "Anonymous"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Date</dt><dd className="mt-0.5">{formatDate(item.created_date)}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="touch" className="flex-1" onClick={() => onView(item)} disabled={busy}><Eye /> View</Button>
        {item.status !== "Resolved" ? <Button type="button" variant="outline" size="touch" onClick={() => onResolve(item)} disabled={busy} aria-label="Mark resolved">{busyId === item.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}</Button> : null}
        {!item.is_archived ? <Button type="button" variant="outline" size="touch" onClick={() => onArchive(item)} disabled={busy} aria-label="Archive feedback">{busyId === item.id ? <Loader2 className="animate-spin" /> : <Archive />}</Button> : null}
      </div>
    </article>
  );
}

/** @param {any} value */
function formatDate(value) {
  return value ? format(new Date(value), "d MMM yyyy") : "Not set";
}
