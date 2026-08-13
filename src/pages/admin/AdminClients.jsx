import React, { useState, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useClients } from "@/hooks/useClients";
import ClientSummaryCards from "@/components/admin/clients/ClientSummaryCards";
import ClientFilters, { EMPTY_CLIENT_FILTERS } from "@/components/admin/clients/ClientFilters";
import ClientTable from "@/components/admin/clients/ClientTable";
import ClientDetailDrawer from "@/components/admin/clients/ClientDetailDrawer";
import { bulkUpdateClients, deleteClients } from "@/services/clientService";
import ClientBulkActionsBar from "@/components/admin/clients/ClientBulkActionsBar";
import { toast } from "sonner";
import { Users } from "lucide-react";
import RequireCapability from "@/components/auth/RequireCapability";
import { hasAtLeastRole } from "@/config/roles";
import SEO from "@/components/SEO";
import { CardSkeleton, EmptyState, ErrorState, NoResultsState, PageLoader, TableSkeleton } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";

export default function AdminClients() {
  const { user, isLoading } = useCurrentUser();
  const [filters, setFilters] = useState(EMPTY_CLIENT_FILTERS);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { data: clients = [], isLoading: loadingClients, error, refetch } = useClients(user?.role);

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase();
    let list = clients.filter((c) => {
      const matchQ = !q || [c.full_name, c.email, c.phone, c.id].some((v) => v?.toLowerCase?.().includes(q));
      return matchQ
        && (filters.status === "all" || (c.status || "active") === filters.status)
        && (filters.tag === "all" || (c.tags || []).includes(filters.tag));
    });
    const sorters = {
      newest: (a, b) => (b.created_date || "").localeCompare(a.created_date || ""),
      oldest: (a, b) => (a.created_date || "").localeCompare(b.created_date || ""),
      recent_activity: (a, b) => (b.last_activity_date || b.updated_date || "").localeCompare(a.last_activity_date || a.updated_date || ""),
      alphabetical: (a, b) => (a.full_name || "").localeCompare(b.full_name || ""),
    };
    return [...list].sort(sorters[filters.sort] || sorters.newest);
  }, [clients, filters]);

  const canBulkEdit = hasAtLeastRole(user?.role, "employee");
  const canDelete = user?.role === "admin";

  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleSelectAll = () => setSelectedIds((prev) => {
    const allSelected = filtered.length > 0 && filtered.every((c) => prev.has(c.id));
    if (allSelected) return new Set();
    return new Set(filtered.map((c) => c.id));
  });
  const clearSelection = () => setSelectedIds(new Set());

  // All bulk edits go through the backend so each one is written to the
  // customer history timeline.
  const runBulkUpdate = async (changes, failureMessage) => {
    const ids = [...selectedIds];
    try {
      const result = await bulkUpdateClients(ids, changes);
      clearSelection();
      await refetch();
      toast.success(result.updated === 0
        ? "No changes needed — those customers were already up to date."
        : `Updated ${result.updated} customer${result.updated === 1 ? "" : "s"}.`);
    } catch (err) {
      toast.error(getSafeErrorMessage(err, failureMessage));
    }
  };

  const bulkStatusChange = (status) => runBulkUpdate({ status }, "Failed to update status.");
  const bulkAddTag = (tag) => runBulkUpdate({ add_tag: tag }, "Failed to add tag.");
  const bulkRemoveTag = (tag) => runBulkUpdate({ remove_tag: tag }, "Failed to remove tag.");

  const bulkDelete = async () => {
    const ids = [...selectedIds].filter(Boolean);
    if (ids.length === 0) return;
    try {
      const result = await deleteClients(ids);
      clearSelection();
      await refetch();
      toast.success(`Deleted ${result.deleted} customer${result.deleted === 1 ? "" : "s"}.`);
    } catch (err) {
      await refetch();
      toast.error(getSafeErrorMessage(err, "Failed to delete customers."));
    }
  };

  const seo = <SEO title="Customers | On The Run Electrics" description="Private staff area for managing customer accounts, statuses, tags and service history." canonical="/admin/clients" noindex />;

  if (isLoading) {
    return <>{seo}<PageLoader label="Loading customer management" fullScreen /></>;
  }

  return (
    <>
    {seo}
    <RequireCapability
      minRole="technician"
      deniedTitle="Staff access only"
      deniedMessage="You don't have permission to view customer management."
    >
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">Manage customer accounts, contact details, linked scooters and full history in one place.</p>
        </div>

        {loadingClients ? <CardSkeleton count={4} compact /> : <ClientSummaryCards clients={clients} />}
        <ClientFilters filters={filters} setFilters={setFilters} />

        {error && clients.length ? (
          <ErrorState title="Latest customer changes could not be loaded" description="Previously loaded customers remain visible." error={error} onRetry={refetch} />
        ) : null}

        {error && !clients.length ? (
          <ErrorState title="Customers could not be loaded" error={error} onRetry={refetch} />
        ) : loadingClients ? (
          <TableSkeleton rows={6} columns={5} label="Loading customers" />
        ) : filtered.length === 0 ? (
          clients.length === 0 ? (
            <EmptyState icon={Users} title="No customers yet" description="Customers appear here after a booking or job is created." />
          ) : (
            <NoResultsState
              title="No customers match these filters"
              description={filters.q ? `No matches for “${filters.q}”.` : "Try broadening the selected status or tag."}
              onClear={() => setFilters(EMPTY_CLIENT_FILTERS)}
            />
          )
        ) : (
          <>
            {canBulkEdit && selectedIds.size > 0 && (
              <ClientBulkActionsBar
                selectedCount={selectedIds.size}
                onStatusChange={bulkStatusChange}
                onAddTag={bulkAddTag}
                onRemoveTag={bulkRemoveTag}
                onDelete={bulkDelete}
                onClear={clearSelection}
                canDelete={canDelete}
              />
            )}
            <ClientTable
              clients={filtered}
              onView={setSelected}
              selected={canBulkEdit ? selectedIds : null}
              onToggleSelect={canBulkEdit ? toggleSelect : null}
              onToggleSelectAll={canBulkEdit ? toggleSelectAll : null}
            />
          </>
        )}

        <ClientDetailDrawer
          client={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          actor={user}
          onChange={(updated) => {
            if (updated) setSelected((current) => current?.id === updated.id ? { ...current, ...updated } : current);
            refetch();
          }}
        />
      </div>
    </RequireCapability>
    </>
  );
}
