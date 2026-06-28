import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import DashboardShell from "@/components/dashboard/DashboardShell";
import ClientSummaryCards from "@/components/admin/clients/ClientSummaryCards";
import ClientFilters, { EMPTY_CLIENT_FILTERS } from "@/components/admin/clients/ClientFilters";
import ClientTable from "@/components/admin/clients/ClientTable";
import ClientDetailDrawer from "@/components/admin/clients/ClientDetailDrawer";
import { listClients } from "@/services/clientService";
import { Button } from "@/components/ui/button";
import { Users, AlertTriangle } from "lucide-react";
import RequireCapability from "@/components/auth/RequireCapability";
import { hasAtLeastRole } from "@/config/roles";
import SEO from "@/components/SEO";

export default function AdminClients() {
  const { user, isLoading } = useCurrentUser();
  const [filters, setFilters] = useState(EMPTY_CLIENT_FILTERS);
  const [selected, setSelected] = useState(null);

  const { data: clients, isLoading: loadingClients, error, refetch } = useQuery({
    queryKey: ["adminCustomers"],
    queryFn: listClients,
    initialData: [],
    enabled: hasAtLeastRole(user?.role, "technician"),
  });

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

  const seo = <SEO title="Customers | OTR Scooters" description="Private staff area for managing customer accounts, statuses, tags and service history." canonical="/admin/clients" noindex />;

  if (isLoading) {
    return <>{seo}<div className="fixed inset-0 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div></>;
  }

  return (
    <>
    {seo}
    <RequireCapability
      minRole="technician"
      deniedTitle="Staff access only"
      deniedMessage="You don't have permission to view customer management."
    >
    <DashboardShell user={user}>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">Manage customer accounts, contact details, linked scooters and full history in one place.</p>
        </div>

        <ClientSummaryCards clients={clients} />
        <ClientFilters filters={filters} setFilters={setFilters} />

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
            <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
            <p className="text-sm text-rose-700">Couldn't load customers. Please refresh and try again.</p>
          </div>
        ) : loadingClients ? (
          <div className="py-16 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {clients.length === 0 ? "No customers yet. They appear here once created via bookings or jobs." : "No customers match your filters."}
            </p>
            {clients.length > 0 && <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setFilters(EMPTY_CLIENT_FILTERS)}>Clear filters</Button>}
          </div>
        ) : (
          <ClientTable clients={filtered} onView={setSelected} />
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
    </DashboardShell>
    </RequireCapability>
    </>
  );
}