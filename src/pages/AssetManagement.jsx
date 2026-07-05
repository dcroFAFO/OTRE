import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Bike } from "lucide-react";
import AssetEditDialog from "@/components/assets/AssetEditDialog";

export default function AssetManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Scooter.list("-updated_date", 300),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["assetCustomers"],
    queryFn: () => base44.entities.Customer.list("", 300),
  });

  const ownerName = useMemo(() => {
    const map = {};
    customers.forEach((c) => {
      if (c.customer_id) map[c.customer_id] = c.full_name || c.name;
      map[c.id] = c.full_name || c.name;
    });
    return (a) => map[a.customer_id] || map[a.customer_account_id] || "—";
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) =>
      [a.make, a.model, a.serial_number, a.colour, ownerName(a)].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [assets, search, ownerName]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["assets"] });

  const handleSave = async (data) => {
    if (data.id) await base44.entities.Scooter.update(data.id, data);
    else await base44.entities.Scooter.create(data);
    refresh();
    setEditing(null);
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete ${a.make || ""} ${a.model}? This cannot be undone.`)) return;
    await base44.entities.Scooter.delete(a.id);
    refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground text-sm">Browse, search and edit all scooters tracked in the system.</p>
        </div>
        <Button size="sm" onClick={() => setEditing({})} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Asset
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search make, model, serial, owner…" className="pl-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-border border-t-accent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center space-y-2">
          <Bike className="h-9 w-9 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">{search ? "No assets match your search." : "No assets tracked yet."}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Serial</th>
                <th className="px-4 py-3 font-medium">Odometer</th>
                <th className="px-4 py-3 font-medium">Last service</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <span className="font-medium">{[a.make, a.model].filter(Boolean).join(" ")}</span>
                    {a.colour && <span className="text-muted-foreground text-xs ml-2">{a.colour}</span>}
                  </td>
                  <td className="px-4 py-3">{ownerName(a)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.serial_number || "—"}</td>
                  <td className="px-4 py-3">{a.odometer_km != null ? `${a.odometer_km} km` : "—"}</td>
                  <td className="px-4 py-3">{a.last_service_date || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing({ ...a })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-500 hover:text-rose-600" onClick={() => handleDelete(a)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <AssetEditDialog asset={editing} onSave={handleSave} onClose={() => setEditing(null)} />}
    </div>
  );
}