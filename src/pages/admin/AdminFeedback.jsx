import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import FeedbackSummaryCards from "@/components/admin/feedback/FeedbackSummaryCards";
import FeedbackFilters, { EMPTY_FB_FILTERS } from "@/components/admin/feedback/FeedbackFilters";
import FeedbackTable from "@/components/admin/feedback/FeedbackTable";
import FeedbackDetailDrawer from "@/components/admin/feedback/FeedbackDetailDrawer";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import RequireCapability from "@/components/auth/RequireCapability";
import { hasAtLeastRole } from "@/config/roles";
import SEO from "@/components/SEO";
import PageLoader from "@/components/shared/PageLoader";
import ErrorState from "@/components/shared/ErrorState";
import EmptyState from "@/components/shared/EmptyState";
import NoResultsState from "@/components/shared/NoResultsState";
import TableSkeleton from "@/components/shared/TableSkeleton";
import CardSkeleton from "@/components/shared/CardSkeleton";
import { getSafeErrorMessage } from "@/lib/errors";

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const STATUS_ORDER = { "New": 0, "Under Review": 1, "Planned": 2, "In Progress": 3, "Resolved": 4, "Rejected": 5, "Archived": 6 };

export default function AdminFeedback() {
  const { user, isLoading } = useCurrentUser();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(EMPTY_FB_FILTERS);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: items = [], isLoading: loadingItems, error, refetch } = useQuery({
    queryKey: ["adminFeedback"],
    queryFn: () => base44.entities.Feedback.list("-created_date", 500),
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
    if (busyId) return;
    setBusyId(item.id);
    try {
      await base44.entities.Feedback.update(item.id, data);
      await invalidate();
      if (successMsg) toast.success(successMsg);
    } catch (err) {
      logError("Failed to update feedback", err, { recordId: item.id });
      toast.error(getSafeErrorMessage(err, "Feedback could not be updated."));
    } finally {
      setBusyId(null);
    }
  };

  const handleResolve = (item) =>
    updateItem(item, { status: "Resolved", resolved_date: new Date().toISOString() }, "Marked as resolved");

  const handleArchive = (item) =>
    updateItem(item, { is_archived: true, status: "Archived" }, "Archived");

  const handleSave = async (item, data) => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = { ...data };
      if (data.status === "Resolved" && item.status !== "Resolved") payload.resolved_date = new Date().toISOString();
      await base44.entities.Feedback.update(item.id, payload);
      await invalidate();
      toast.success("Feedback updated");
      setSelected(null);
    } catch (err) {
      logError("Failed to save feedback", err, { recordId: item.id });
      toast.error(getSafeErrorMessage(err, "Feedback changes could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const seo = <SEO title="Feedback Admin | On The Run Electrics" description="Private admin area for reviewing and managing app and customer feedback." canonical="/admin/feedback" noindex />;

  if (isLoading) {
    return <>{seo}<PageLoader label="Loading feedback" /></>;
  }

  return (
    <>
    {seo}
    <RequireCapability
      minRole="admin"
      deniedTitle="Admin access only"
      deniedMessage="You don't have permission to view feedback management."
    >
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Feedback</h1>
          <p className="text-muted-foreground text-sm">Review and act on feedback submitted by your users.</p>
        </div>

        {loadingItems ? <CardSkeleton count={6} compact /> : <FeedbackSummaryCards items={items} />}
        <FeedbackFilters filters={filters} setFilters={setFilters} />

        {error && items.length ? <ErrorState title="Latest feedback changes could not be loaded" description="Previously loaded feedback remains visible." error={error} onRetry={refetch} /> : null}

        {error && !items.length ? (
          <ErrorState onRetry={refetch} />
        ) : loadingItems ? (
          <TableSkeleton rows={6} columns={5} />
        ) : filtered.length === 0 ? (
          items.length === 0 ? (
            <EmptyState title="No feedback submitted yet" description="New feedback will appear here when a customer or staff member sends it." />
          ) : (
            <NoResultsState onClear={() => setFilters(EMPTY_FB_FILTERS)} />
          )
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
    </RequireCapability>
    </>
  );
}
