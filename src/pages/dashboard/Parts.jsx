import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ExternalLink, Package, RefreshCw, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState, ErrorState, NoResultsState, TableSkeleton } from "@/components/shared";
import { cn } from "@/lib/utils";
import { detectBrands } from "@/lib/partsFilter";
import { getSafeErrorMessage } from "@/lib/errors";

const PAGE_SIZE = 25;
const MAX_SYNC_PAGES = 40;

export default function Parts() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { search: locationSearch } = useLocation();
  const category = new URLSearchParams(locationSearch).get("category") || "";
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(/** @type {{ processed: number, total: number } | null} */ (null));
  const [syncResult, setSyncResult] = useState(/** @type {{ success: boolean, message: string } | null} */ (null));

  const productsQuery = useQuery({
    queryKey: ["estore-products"],
    queryFn: () => base44.entities.Product.filter({ supplier: "eScootNow" }, "name", 500),
  });
  const products = /** @type {Array<Record<string, any>>} */ (productsQuery.data || []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncProgress(null);

    let offset = 0;
    let totalCreated = 0;
    let totalUpdated = 0;

    try {
      for (let page = 0; page < MAX_SYNC_PAGES; page += 1) {
        const response = await base44.functions.invoke("syncEcwidProducts", { offset, page_size: PAGE_SIZE });
        const data = response?.data;
        if (!data || !Number.isFinite(Number(data.processed)) || !Number.isFinite(Number(data.total))) {
          throw new Error("Invalid catalogue response");
        }
        totalCreated += Number(data.created || 0);
        totalUpdated += Number(data.updated || 0);
        setSyncProgress({ processed: Math.min(offset + Number(data.processed), Number(data.total)), total: Number(data.total) });

        if (!data.has_more) break;
        if (page === MAX_SYNC_PAGES - 1 || Number(data.next_offset) <= offset) throw new Error("Catalogue sync did not finish");
        offset = Number(data.next_offset);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await queryClient.invalidateQueries({ queryKey: ["estore-products"] });
      setSyncResult({ success: true, message: `Catalogue updated: ${totalCreated} added and ${totalUpdated} refreshed.` });
    } catch (error) {
      setSyncResult({ success: false, message: getSafeErrorMessage(error, "The catalogue could not be refreshed. Please try again.") });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (category && product.category_label !== category) return false;
      return !query || [product.name, product.sku, product.description, product.category_label]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [category, products, search]);

  const clearFilters = () => {
    setSearch("");
    if (category) navigate("/dashboard/parts");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">{category || "Parts"}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Search and refresh the workshop parts catalogue.</p>
        </div>
        <Button type="button" size="touch" onClick={handleSync} disabled={syncing} aria-describedby={syncing ? "parts-sync-status" : undefined}>
          <RefreshCw className={cn(syncing && "animate-spin")} aria-hidden="true" />
          {syncing ? "Refreshing catalogue..." : "Refresh catalogue"}
        </Button>
      </header>

      {syncing ? (
        <p id="parts-sync-status" className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {syncProgress ? `Processed ${syncProgress.processed} of ${syncProgress.total} products.` : "Connecting to the catalogue..."}
        </p>
      ) : null}

      {syncResult ? (
        <Alert variant={syncResult.success ? "default" : "destructive"} role={syncResult.success ? "status" : "alert"}>
          {syncResult.success ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
          <AlertTitle>{syncResult.success ? "Catalogue refreshed" : "Refresh failed"}</AlertTitle>
          <AlertDescription>{syncResult.message}</AlertDescription>
        </Alert>
      ) : null}

      {products.length ? (
        <label className="relative block max-w-md">
          <span className="sr-only">Search parts by name, SKU, description, or category</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input placeholder="Search parts" value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 pl-9" />
        </label>
      ) : null}

      {productsQuery.error && products.length ? (
        <ErrorState title="Latest catalogue changes could not be loaded" description="Previously loaded parts remain visible." error={productsQuery.error} onRetry={productsQuery.refetch} />
      ) : null}

      {productsQuery.isLoading ? (
        <TableSkeleton rows={8} columns={6} label="Loading parts catalogue" />
      ) : productsQuery.error && !products.length ? (
        <ErrorState title="Parts catalogue could not be loaded" error={productsQuery.error} onRetry={productsQuery.refetch} />
      ) : !products.length ? (
        <EmptyState
          icon={Package}
          title="No parts have been imported"
          description="Refresh the catalogue to import products for workshop jobs."
          action={<Button type="button" onClick={handleSync} disabled={syncing}><RefreshCw /> Refresh catalogue</Button>}
        />
      ) : !filtered.length ? (
        <NoResultsState title="No parts match these filters" description="Clear the search or category to see all catalogue products." onClear={clearFilters} />
      ) : (
        <PartsResults products={filtered} />
      )}
    </div>
  );
}

/** @param {{ products: Array<Record<string, any>> }} props */
function PartsResults({ products }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 md:hidden">
        {products.map((product) => <PartCard key={product.id} product={product} />)}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Workshop parts catalogue</caption>
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <th className="px-4 py-3 text-left">Part</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="hidden px-4 py-3 text-left lg:table-cell">Brand</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="w-16 px-4 py-3"><span className="sr-only">Supplier link</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => {
              const brand = detectBrands(product)[0];
              return (
                <tr key={product.id} className="transition-colors hover:bg-secondary/30">
                  <td className="px-4 py-3"><PartIdentity product={product} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{product.category_label || "Not set"}</td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">{brand || "Not set"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3 text-center"><StockBadge inStock={product.in_stock} /></td>
                  <td className="px-2 py-2 text-right">
                    {product.supplier_url ? (
                      <Button asChild variant="ghost" size="iconTouch">
                        <a href={product.supplier_url} target="_blank" rel="noopener noreferrer" aria-label={`Open supplier page for ${product.name}`}><ExternalLink aria-hidden="true" /></a>
                      </Button>
                    ) : null}
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

/** @param {{ product: Record<string, any> }} props */
function PartCard({ product }) {
  const brand = detectBrands(product)[0];
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <PartIdentity product={product} />
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Category</dt><dd className="mt-0.5 line-clamp-2">{product.category_label || "Not set"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Brand</dt><dd className="mt-0.5 truncate">{brand || "Not set"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Price</dt><dd className="mt-0.5 font-heading font-bold">{formatPrice(product.price)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Availability</dt><dd className="mt-0.5"><StockBadge inStock={product.in_stock} /></dd></div>
      </dl>
      {product.supplier_url ? <Button asChild variant="outline" size="touch" className="mt-4 w-full"><a href={product.supplier_url} target="_blank" rel="noopener noreferrer">Open supplier page <ExternalLink aria-hidden="true" /></a></Button> : null}
    </article>
  );
}

/** @param {{ product: Record<string, any> }} props */
function PartIdentity({ product }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {product.image_url ? (
        <img src={product.image_url} alt="" className="h-11 w-11 shrink-0 rounded-md bg-secondary object-cover" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary"><Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" /></span>
      )}
      <div className="min-w-0">
        <p className="line-clamp-2 font-semibold text-foreground">{product.name}</p>
        {product.sku ? <p className="truncate font-mono text-[11px] text-muted-foreground">{product.sku}</p> : null}
      </div>
    </div>
  );
}

/** @param {{ inStock?: boolean }} props */
function StockBadge({ inStock }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", inStock ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{inStock ? "In stock" : "Out of stock"}</span>;
}

/** @param {any} value */
function formatPrice(value) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value || 0));
}
