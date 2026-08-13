import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, NoResultsState, TableSkeleton } from "@/components/shared";
import AssetEditDialog from "@/components/assets/AssetEditDialog";
import { createScooter, deleteScooter, updateScooter } from "@/services/clientService";
import { getSafeErrorMessage } from "@/lib/errors";

const ASSET_FIELDS = ["make", "model", "year", "serial_number", "colour", "battery_voltage", "odometer_km", "last_service_date", "notes"];

export default function AssetManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(/** @type {Record<string, any> | null} */ (null));
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null));

  const assetsQuery = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Scooter.list("-updated_date", 300),
    staleTime: 30_000,
  });
  const customersQuery = useQuery({
    queryKey: ["assetCustomers"],
    queryFn: () => base44.entities.Customer.list("", 300),
    staleTime: 5 * 60_000,
  });
  const assets = /** @type {Array<Record<string, any>>} */ (assetsQuery.data || []);
  const customers = /** @type {Array<Record<string, any>>} */ (customersQuery.data || []);

  const ownerName = useMemo(() => {
    const map = {};
    customers.forEach((customer) => {
      if (customer.customer_id) map[customer.customer_id] = customer.full_name || customer.name;
      map[customer.id] = customer.full_name || customer.name;
    });
    return (asset) => map[asset.customer_id] || map[asset.customer_account_id] || (customersQuery.isLoading ? "Loading owner..." : "Not assigned");
  }, [customers, customersQuery.isLoading]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) => [asset.make, asset.model, asset.serial_number, asset.colour, ownerName(asset)]
      .some((value) => String(value || "").toLowerCase().includes(query)));
  }, [assets, ownerName, search]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["assets"] });

  const handleSave = async (data) => {
    const fields = {};
    ASSET_FIELDS.forEach((key) => {
      if (data[key] !== undefined) fields[key] = data[key];
    });
    try {
      if (data.id) await updateScooter(data.id, { ...fields, customer_id: data.customer_id || "" });
      else await createScooter("", fields);
      await refresh();
      setEditing(null);
      toast.success(data.id ? "Asset updated" : "Asset added");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The asset could not be saved."));
    }
  };

  const handleDelete = async (asset) => {
    if (deletingId) return;
    const assetName = [asset.make, asset.model].filter(Boolean).join(" ") || "this asset";
    if (!window.confirm(`Delete ${assetName}? This cannot be undone.`)) return;
    setDeletingId(asset.id);
    try {
      await deleteScooter(asset.id);
      await refresh();
      toast.success("Asset deleted");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The asset could not be deleted."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Asset management</h1>
          <p className="text-sm text-muted-foreground">Browse, search, and edit scooters tracked for customers.</p>
        </div>
        <Button type="button" size="touch" onClick={() => setEditing({})}><Plus aria-hidden="true" /> New asset</Button>
      </header>

      {assets.length ? (
        <label className="relative block max-w-md">
          <span className="sr-only">Search assets by make, model, serial number, colour, or owner</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets" className="h-11 pl-9" />
        </label>
      ) : null}

      {assetsQuery.error && assets.length ? <ErrorState title="Latest asset changes could not be loaded" description="Previously loaded assets remain visible." error={assetsQuery.error} onRetry={assetsQuery.refetch} /> : null}
      {customersQuery.error ? <ErrorState title="Asset owners could not be loaded" description="Scooter details remain available without customer names." error={customersQuery.error} onRetry={customersQuery.refetch} /> : null}

      {assetsQuery.isLoading ? (
        <TableSkeleton rows={7} columns={6} label="Loading assets" />
      ) : assetsQuery.error && !assets.length ? (
        <ErrorState title="Assets could not be loaded" error={assetsQuery.error} onRetry={assetsQuery.refetch} />
      ) : !assets.length ? (
        <EmptyState icon={Bike} title="No assets are tracked yet" description="Add a scooter to make it available in customer and job workflows." action={<Button type="button" onClick={() => setEditing({})}><Plus /> New asset</Button>} />
      ) : !filtered.length ? (
        <NoResultsState title="No assets match this search" description="Clear the search to return to all tracked scooters." onClear={() => setSearch("")} />
      ) : (
        <AssetResults assets={filtered} ownerName={ownerName} deletingId={deletingId} onEdit={setEditing} onDelete={handleDelete} />
      )}

      {editing ? <AssetEditDialog asset={editing} onSave={handleSave} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/** @param {{ assets: Array<Record<string, any>>, ownerName: (asset: Record<string, any>) => string, deletingId: string | null, onEdit: (asset: Record<string, any>) => void, onDelete: (asset: Record<string, any>) => void }} props */
function AssetResults({ assets, ownerName, deletingId, onEdit, onDelete }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {assets.map((asset) => <AssetCard key={asset.id} asset={asset} owner={ownerName(asset)} deleting={deletingId === asset.id} onEdit={onEdit} onDelete={onDelete} />)}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Customer scooters and service details</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Serial</th>
              <th className="px-4 py-3 font-medium">Odometer</th>
              <th className="px-4 py-3 font-medium">Last service</th>
              <th className="w-24 px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.map((asset) => {
              const name = assetName(asset);
              return (
                <tr key={asset.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3"><span className="font-medium">{name}</span>{asset.colour ? <span className="ml-2 text-xs text-muted-foreground">{asset.colour}</span> : null}</td>
                  <td className="px-4 py-3">{ownerName(asset)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{asset.serial_number || "Not set"}</td>
                  <td className="px-4 py-3">{asset.odometer_km != null ? `${asset.odometer_km} km` : "Not set"}</td>
                  <td className="px-4 py-3">{formatDate(asset.last_service_date)}</td>
                  <td className="px-2 py-2 text-right">
                    <Button type="button" variant="ghost" size="iconTouch" aria-label={`Edit ${name}`} onClick={() => onEdit({ ...asset })}><Pencil aria-hidden="true" /></Button>
                    <Button type="button" variant="ghost" size="iconTouch" className="text-destructive hover:text-destructive" aria-label={`Delete ${name}`} disabled={Boolean(deletingId)} onClick={() => onDelete(asset)}>
                      {deletingId === asset.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** @param {{ asset: Record<string, any>, owner: string, deleting: boolean, onEdit: (asset: Record<string, any>) => void, onDelete: (asset: Record<string, any>) => void }} props */
function AssetCard({ asset, owner, deleting, onEdit, onDelete }) {
  const name = assetName(asset);
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 className="truncate font-semibold">{name}</h2><p className="truncate text-sm text-muted-foreground">{owner}</p></div>
        <Bike className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Serial</dt><dd className="mt-0.5 truncate font-mono text-xs">{asset.serial_number || "Not set"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Colour</dt><dd className="mt-0.5">{asset.colour || "Not set"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Odometer</dt><dd className="mt-0.5">{asset.odometer_km != null ? `${asset.odometer_km} km` : "Not set"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Last service</dt><dd className="mt-0.5">{formatDate(asset.last_service_date)}</dd></div>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="touch" onClick={() => onEdit({ ...asset })}><Pencil /> Edit</Button>
        <Button type="button" variant="outline" size="touch" className="text-destructive hover:text-destructive" disabled={deleting} onClick={() => onDelete(asset)}>
          {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />} {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </article>
  );
}

/** @param {Record<string, any>} asset */
function assetName(asset) {
  return [asset.make, asset.model].filter(Boolean).join(" ") || "Unnamed asset";
}

/** @param {any} value */
function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("en-AU") : "Not set";
}
