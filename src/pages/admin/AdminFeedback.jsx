import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import DashboardShell from "@/components/dashboard/DashboardShell";
import FeedbackSummaryCards from "@/components/admin/feedback/FeedbackSummaryCards";
import FeedbackFilters, { EMPTY_FB_FILTERS } from "@/components/admin/feedback/FeedbackFilters";
import FeedbackTable from "@/components/admin/feedback/FeedbackTable";
import FeedbackDetailDrawer from "@/components/admin/feedback/FeedbackDetailDrawer";
import { Button } from "@/components/ui/button";
import { Inbox, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { logError } from "@/lib/logger";
import RequireCapability from "@/components/auth/RequireCapability";
import { hasAtLeastRole } from "@/config/roles";
import SEO from "@/components/SEO";

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER = { "New": 0, "Under Review": 1, "Planned": 2, "In Progress": 3, "Resolved": 4, "Rejected": 5, "Archived": 6 };

export default function AdminFeedback() {
  const { user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState(EMPTY_FB_FILTERS);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: items, isLoading: loadingItems, error } = useQuery({
    queryKey: ["adminFeedback"],
    queryFn: () => base44.entities.Feedback.list("-created_date", 500),
    initialData: [],
    enabled: hasAtLeastRole(user?.role, "admin"),
  });

  const filtered = useMemo(() => {
    let list = items.filter((f) => {
      const q = filters.q.toLowerCase();
      const matchQ = !q || [f.subject, f.message, f.submitted_by_name, f.submitted_by_email].some((v) => v?.toLowerCase().includes(q));
      return matchQ
        && (filters.status === "all" ? !f.is_archived : f.status === filters.status)
        && (filters.type === "all" || f.feedback_type === filters.type)
        && (filters.priority === "all" || f.priority === filters.priority);
    });
    const sorters = {
      newest: (a, b) => (b.created_date || "").localeCompare(a.created_date || ""),
      oldest: (a, b) => (a.created_date || "").localeCompare(b.created_date || ""),
      priority: (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9),
      status: (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9),
    };
    return [...list].sort(sorters[filters.sort] || sorters.newest);
  }, [items, filters]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["adminFeedback"] });

  const updateItem = async (item, data, successMsg) => {
    setBusyId(item.id);
    try {
      await base44.entities.Feedback.update(item.id, data);
      invalidate();
      if (successMsg) toast({ title: successMsg });
    } catch (err) {
      logError("Failed to update feedback", err, { recordId: item.id });
      toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = (item) =>
    updateItem(item, { status: "Resolved", resolved_date: new Date().toISOString() }, "Marked as resolved");

  const handleArchive = (item) =>
    updateItem(item, { is_archived: true, status: "Archived" }, "Archived");

  const handleSave = async (item, data) => {
    setSaving(true);
    try {
      const payload = { ...data };
      if (data.status === "Resolved" && item.status !== "Resolved") payload.resolved_date = new Date().toISOString();
      await base44.entities.Feedback.update(item.id, payload);
      invalidate();
      toast({ title: "Feedback updated" });
      setSelected(null);
    } catch (err) {
      logError("Failed to save feedback", err, { recordId: item.id });
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const seo = <SEO title="Feedback Admin | OTR Scooters" description="Private admin area for reviewing and managing app and customer feedback." canonical="/admin/feedback" noindex />;

  if (isLoading) {
    return <>{seo}<div className="fixed inset-0 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div></>;
  }

  return (
    <>
    {seo}
    <RequireCapability
      minRole="admin"
      deniedTitle="Admin access only"
      deniedMessage="You don't have permission to view feedback management."
    >
    <DashboardShell user={user}>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground text-sm">Review and act on feedback submitted by your users.</p>
        </div>

        <FeedbackSummaryCards items={items} />
        <FeedbackFilters filters={filters} setFilters={setFilters} />

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
            <p className="text-sm text-rose-700">Couldn't load feedback. Please refresh and try again.</p>
          </div>
        ) : loadingItems ? (
          <div className="py-16 grid place-items-center">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "No feedback submitted yet." : "No feedback matches your filters."}
            </p>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setFilters(EMPTY_FB_FILTERS)}>Clear filters</Button>
            )}
          </div>
        ) : (
          <FeedbackTable
            items={filtered}
            onView={setSelected}
            onResolve={handleResolve}
            onArchive={handleArchive}
            busyId={busyId}
          />
        )}

        <FeedbackDetailDrawer
          item={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </DashboardShell>
    </RequireCapability>
    </>
  );
}