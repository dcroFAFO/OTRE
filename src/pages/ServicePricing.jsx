import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import DefaultPricingCard from "@/components/settings/DefaultPricingCard";
import ServicePriceRow from "@/components/pricing/ServicePriceRow";
import AddCategoryDialog from "@/components/pricing/AddCategoryDialog";

export default function ServicePricing() {
  const qc = useQueryClient();
  const [addingCategory, setAddingCategory] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["pricingServices"],
    queryFn: () => base44.entities.ServiceItem.list("order", 200),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["pricingCategories"],
    queryFn: () => base44.entities.ServiceCategory.filter({ active: true }, "order", 100),
  });

  const savePrice = async (item, price) => {
    await base44.entities.ServiceItem.update(item.id, { price });
    qc.invalidateQueries({ queryKey: ["pricingServices"] });
    qc.invalidateQueries({ queryKey: ["platformConfig"] });
    toast.success(`Price updated for ${item.name}`);
  };

  const addCategory = async (data) => {
    await base44.entities.ServiceCategory.create({ ...data, business_slug: "otr-scooters", order: categories.length });
    qc.invalidateQueries({ queryKey: ["pricingCategories"] });
    setAddingCategory(false);
    toast.success("Category added");
  };

  const grouped = categories
    .map((c) => ({ category: c, items: services.filter((s) => s.category_key === c.key) }))
    .filter((g) => g.items.length > 0);
  const uncategorised = services.filter((s) => !categories.some((c) => c.key === s.category_key));

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">Service Pricing</h1>
          <p className="text-muted-foreground text-sm">Update service prices, manage categories and labour rates.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddingCategory(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Category
        </Button>
      </div>

      <DefaultPricingCard />

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-border border-t-accent rounded-full animate-spin" /></div>
      ) : (
        <>
          {grouped.map(({ category, items }) => (
            <div key={category.key} className="space-y-2">
              <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground">{category.name}</h2>
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                {items.map((item) => <ServicePriceRow key={item.id} item={item} onSavePrice={savePrice} />)}
              </div>
            </div>
          ))}
          {uncategorised.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-heading font-bold text-sm uppercase tracking-wide text-muted-foreground">Other</h2>
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                {uncategorised.map((item) => <ServicePriceRow key={item.id} item={item} onSavePrice={savePrice} />)}
              </div>
            </div>
          )}
        </>
      )}

      {addingCategory && <AddCategoryDialog onSave={addCategory} onClose={() => setAddingCategory(false)} />}
    </div>
  );
}