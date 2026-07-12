import React, { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Package, ExternalLink, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectBrands } from "@/lib/partsFilter";

export default function Parts() {
  const qc = useQueryClient();
  const { search: locationSearch } = useLocation();
  const category = new URLSearchParams(locationSearch).get("category") || "";
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["estore-products"],
    queryFn: () => base44.entities.Product.filter({ supplier: "eScootNow" }, "name", 500),
  });

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncProgress(null);

    let offset = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    const PAGE_SIZE = 25;

    try {
      while (true) {
        const res = await base44.functions.invoke("syncEcwidProducts", { offset, page_size: PAGE_SIZE });
        const data = res.data;
        totalCreated += data.created;
        totalUpdated += data.updated;
        setSyncProgress({ processed: offset + data.processed, total: data.total });

        if (!data.has_more) break;
        offset = data.next_offset;
        await new Promise((r) => setTimeout(r, 500));
      }

      qc.invalidateQueries({ queryKey: ["estore-products"] });
      setSyncResult({ success: true, message: `Sync complete: ${totalCreated} new, ${totalUpdated} updated.` });
    } catch (err) {
      setSyncResult({ success: false, message: err.message || "Sync failed." });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category_label !== category) return false;
      if (q) {
        return (
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category_label?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, category]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            {category || "Parts"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            eScootNow parts catalogue — synced from Ecwid.
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="gap-2 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm shadow-accent/20">
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing
            ? syncProgress
              ? `Syncing… ${syncProgress.processed}/${syncProgress.total}`
              : "Starting…"
            : "Sync from Ecwid"}
        </Button>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className={cn(
          "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
          syncResult.success
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-rose-200 bg-rose-50 text-rose-800"
        )}>
          {syncResult.success
            ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{syncResult.message}</span>
        </div>
      )}

      {/* Search */}
      {products.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, SKU, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      )}

      {/* Product table */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="h-7 w-7 border-4 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No parts yet</p>
          <p className="text-sm mt-1">Click "Sync from Ecwid" to import your eScootNow catalogue.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No parts match your search</p>
          <p className="text-sm mt-1">Try a different search or category.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Part</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Brand</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell">Stock</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const brand = detectBrands(p)[0];
                return (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="h-9 w-9 rounded-lg object-cover shrink-0 bg-secondary" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-secondary shrink-0 flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground line-clamp-1">{p.name}</p>
                          {p.sku && <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{p.category_label || "—"}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{brand || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      ${(p.price ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                        p.in_stock ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {p.in_stock ? "In stock" : "Out of stock"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.supplier_url && (
                        <a href={p.supplier_url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors inline-flex">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
