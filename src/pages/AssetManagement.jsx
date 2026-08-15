import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bike, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoundedDataNotice, EmptyState, ErrorState, NoResultsState, TableSkeleton } from "@/components/shared";
import AssetEditDialog from "@/components/assets/AssetEditDialog";
import { createScooter, updateScooter } from "@/services/clientService";
import { getSafeErrorMessage } from "@/lib/errors";
import { useEntityPages } from "@/hooks/useEntityPages";
import { useClients } from "@/hooks/useClients";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const ASSET_FIELDS = ["make", "model", "year", "serial_number", "colour", "battery_voltage", "odometer_km", "last_service_date", "notes"];
const ASSET_PAGE_SIZE = 100;

export default function AssetManagement() {
  const queryClient = useQueryClient();
  const { role } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(/** @type {Record<string, any> | null} */ (null));

  const assetsQuery = useEntityPages({
    queryKey: ["assets"],
    fetchPage: ({ limit, skip }) => base44.entities.Scooter.list("-updated_date", limit, skip),
    pageSize: ASSET_PAGE_SIZE,
    staleTime: 30_000,
  });
  const customersQuery = useClients(role);
  const assetRecords = /** @type {Array<Record<string, any>>} */ (assetsQuery.data || []);
  const assets = useMemo(() => assetRecords.filter((asset) => !asset.archived_at), [assetRecords]);
  const customers = /** @type {Array<Record<string, any>>} */ (customersQuery.data || []);

  const ownerName = useMemo(() => {
    const map = {};
    customers.forEach((customer) => {
      if (customer.reference) map[customer.reference] = customer.full_name || customer.name;
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
      else await createScooter(data.customer_id, fields);
      await refresh();
      setEditing(null);
      toast.success(data.id ? "Asset updated" : "Asset added");
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The asset could not be saved."));
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Asset management</h1>
          <p className="text-sm text-muted-foreground">Browse, search, and edit scooters tracked for customers.</p>
          <p className="mt-1 text-xs text-muted-foreground">Linked assets are archived from the customer record so their service history remains intact.</p>
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

      <BoundedDataNotice
        noun="assets"
        loadedCount={assets.length}
        hasMore={assetsQuery.hasNextPage}
        isLoadingMore={assetsQuery.isFetchingNextPage}
        onLoadMore={assetsQuery.fetchNextPage}
        description={`Search currently covers ${assets.length} active assets from ${assetRecords.length} loaded records. Load more to include older assets.`}
      />
      <BoundedDataNotice
        noun="customers"
        loadedCount={customers.length}
        hasMore={customersQuery.hasNextPage}
        isLoadingMore={customersQuery.isFetchingNextPage}
        onLoadMore={customersQuery.fetchNextPage}
        description={`Owner names and the asset customer picker currently cover ${customers.length} loaded customers. Load more before assigning an older customer.`}
      />

      {assetsQuery.error && assets.length ? <ErrorState title="Latest asset changes could not be loaded" description="Previously loaded assets remain visible." error={assetsQuery.error} onRetry={assetsQuery.refetch} /> : null}
      {customersQuery.error ? <ErrorState title="Asset owners could not be loaded" description="Scooter details remain available without customer names." error={customersQuery.error} onRetry={customersQuery.refetch} /> : null}

      {assetsQuery.isLoading ? (
        <TableSkeleton rows={7} columns={6} label="Loading assets" />
      ) : assetsQuery.error && !assets.length ? (
        <ErrorState title="Assets could not be loaded" error={assetsQuery.error} onRetry={assetsQuery.refetch} />
      ) : !assets.length && assetsQuery.hasNextPage ? (
        <EmptyState
          icon={Bike}
          title="No active assets in the loaded records"
          description="Older active assets may still exist. Load the next page to continue checking."
          action={<Button type="button" onClick={() => assetsQuery.fetchNextPage()} disabled={assetsQuery.isFetchingNextPage}>{assetsQuery.isFetchingNextPage ? "Loading assets…" : "Load more assets"}</Button>}
        />
      ) : !assets.length ? (
        <EmptyState icon={Bike} title="No assets are tracked yet" description="Add a scooter to make it available in customer and job workflows." action={<Button type="button" onClick={() => setEditing({})}><Plus /> New asset</Button>} />
      ) : !filtered.length ? (
        <NoResultsState title="No assets match this search" description="Clear the search to return to all tracked scooters." onClear={() => setSearch("")} />
      ) : (
        <AssetResults assets={filtered} ownerName={ownerName} onEdit={setEditing} />
      )}

      {editing ? <AssetEditDialog asset={editing} customers={customers} customersLoading={customersQuery.isLoading} onSave={handleSave} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

/** @param {{ assets: Array<Record<string, any>>, ownerName: (asset: Record<string, any>) => string, deletingId: string | null, onEdit: (asset: Record<string, any>) => void, onDelete: (asset: Record<string, any>) => void }} props */
function AssetResults({ assets, ownerName, onEdit }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {assets.map((asset) => <AssetCard key={asset.id} asset={asset} owner={ownerName(asset)} onEdit={onEdit} />)}
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
function AssetCard({ asset, owner, onEdit }) {
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
       <div className="mt-4">
         <Button type="button" variant="outline" size="touch" onClick={() => onEdit({ ...asset })}><Pencil /> Edit</Button>
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
