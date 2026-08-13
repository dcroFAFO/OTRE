import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Pencil, Plus, Search, Tags, Wrench } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import ServiceItemEditor from "@/components/pricing/ServiceItemEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CardSkeleton, EmptyState, ErrorState, FieldShell, NoResultsState } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";

const emptyCategory = { name: "", description: "", order: "0", active: true };

/** @param {string} value */
function categoryKey(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** @param {number} value */
function formatPrice(value) {
  const amount = Number(value) || 0;
  return amount > 0 ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount) : "Quote on assessment";
}

export default function ServicePricingAdmin() {
  const queryClient = useQueryClient();
  const servicesQuery = useQuery({
    queryKey: ["pricingServices"],
    queryFn: () => base44.entities.ServiceItem.list("order", 300),
  });
  const categoriesQuery = useQuery({
    queryKey: ["pricingCategories"],
    queryFn: () => base44.entities.ServiceCategory.list("order", 100),
  });
  const services = servicesQuery.data || [];
  const categories = categoriesQuery.data || [];

  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [editingServiceId, setEditingServiceId] = useState(/** @type {string | null} */ (null));
  const [editingCategoryId, setEditingCategoryId] = useState(/** @type {string | null} */ (null));
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [categoryErrors, setCategoryErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [pendingAction, setPendingAction] = useState("");

  const visibleCategories = useMemo(
    () => [...categories].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.name).localeCompare(String(b.name))),
    [categories]
  );
  const filteredServices = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...services]
      .filter((service) => visibility === "all" || (visibility === "active" ? service.active !== false : service.active === false))
      .filter((service) => !needle || [service.name, service.description, service.category].some((value) => String(value || "").toLowerCase().includes(needle)))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.name).localeCompare(String(b.name)));
  }, [search, services, visibility]);

  const refreshPricing = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pricingServices"] }),
      queryClient.invalidateQueries({ queryKey: ["pricingCategories"] }),
    ]);
  };

  const runAction = async (key, action, successMessage) => {
    if (pendingAction) return false;
    setPendingAction(key);
    try {
      await action();
      await refreshPricing();
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Pricing could not be updated."));
      return false;
    } finally {
      setPendingAction("");
    }
  };

  const startCategory = (category = null) => {
    setEditingCategoryId(category?.id || "new");
    setCategoryForm(category ? {
      name: category.name || "",
      description: category.description || "",
      order: String(category.order ?? 0),
      active: category.active !== false,
    } : emptyCategory);
    setCategoryErrors({});
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    if (pendingAction) return;
    const name = categoryForm.name.trim();
    const order = Number(categoryForm.order || 0);
    if (!name) {
      setCategoryErrors({ name: "Enter a category name." });
      document.getElementById("pricing-category-name")?.focus();
      return;
    }
    if (!Number.isFinite(order) || order < 0) {
      setCategoryErrors({ order: "Display order must be zero or more." });
      document.getElementById("pricing-category-order")?.focus();
      return;
    }

    const existing = categories.find((category) => category.id === editingCategoryId);
    const key = existing?.key || categoryKey(name);
    if (!key || categories.some((category) => category.id !== editingCategoryId && category.key === key)) {
      setCategoryErrors({ name: "A category with this name already exists." });
      return;
    }

    const payload = { key, name, description: categoryForm.description.trim(), order, active: categoryForm.active };
    const saved = await runAction(
      `category-${editingCategoryId}`,
      () => existing ? base44.entities.ServiceCategory.update(existing.id, payload) : base44.entities.ServiceCategory.create(payload),
      existing ? "Category updated" : "Category added"
    );
    if (saved) setEditingCategoryId(null);
  };

  const saveService = async (service, payload) => {
    const saved = await runAction(
      `service-${service?.id || "new"}`,
      () => service?.id ? base44.entities.ServiceItem.update(service.id, payload) : base44.entities.ServiceItem.create(payload),
      service?.id ? "Service updated" : "Service added"
    );
    if (saved) setEditingServiceId(null);
  };

  const toggleService = async (service) => {
    await runAction(
      `toggle-service-${service.id}`,
      () => base44.entities.ServiceItem.update(service.id, { active: service.active === false }),
      service.active === false ? "Service restored" : "Service hidden from public pricing"
    );
  };

  const toggleCategory = async (category) => {
    const activeServices = services.filter((service) => service.category_key === category.key && service.active !== false);
    if (category.active !== false && activeServices.length) {
      toast.error("Move or hide the active services in this category before hiding it.");
      return;
    }
    await runAction(
      `toggle-category-${category.id}`,
      () => base44.entities.ServiceCategory.update(category.id, { active: category.active === false }),
      category.active === false ? "Category restored" : "Category hidden"
    );
  };

  const clearFilters = () => {
    setSearch("");
    setVisibility("all");
  };

  const groupedServices = visibleCategories.map((category) => ({
    category,
    items: filteredServices.filter((service) => service.category_key === category.key),
  }));
  const uncategorised = filteredServices.filter((service) => !visibleCategories.some((category) => category.key === service.category_key));
  const hasFilters = Boolean(search.trim()) || visibility !== "all";
  const isLoading = servicesQuery.isLoading || categoriesQuery.isLoading;

  return (
    <>
      <SEO title="Service Pricing Settings | On The Run Electrics" description="Manage public service categories and pricing." canonical="/settings/service-pricing" noindex />
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-extrabold">Service pricing</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage the services and prices shown on the public pricing page.</p>
          </div>
          <div className="flex flex-col gap-2 min-[420px]:flex-row">
            <Button type="button" variant="outline" size="touch" onClick={() => startCategory()} disabled={Boolean(pendingAction)}>
              <Tags aria-hidden="true" /> Add category
            </Button>
            <Button type="button" size="touch" onClick={() => setEditingServiceId("new")} disabled={Boolean(pendingAction)}>
              <Plus aria-hidden="true" /> Add service
            </Button>
          </div>
        </header>

        {editingCategoryId ? (
          <form onSubmit={saveCategory} className="border-y border-border bg-secondary/20 py-5" aria-label={editingCategoryId === "new" ? "Add category" : "Edit category"}>
            <div className="grid gap-4 px-4 sm:grid-cols-2 sm:px-5">
              <FieldShell id="pricing-category-name" label="Category name" error={categoryErrors.name} required>
                <Input value={categoryForm.name} onChange={(event) => { setCategoryForm((current) => ({ ...current, name: event.target.value })); setCategoryErrors((current) => ({ ...current, name: "" })); }} autoFocus />
              </FieldShell>
              <FieldShell id="pricing-category-order" label="Display order" error={categoryErrors.order}>
                <Input type="number" min="0" step="1" value={categoryForm.order} onChange={(event) => { setCategoryForm((current) => ({ ...current, order: event.target.value })); setCategoryErrors((current) => ({ ...current, order: "" })); }} />
              </FieldShell>
              <FieldShell id="pricing-category-description" label="Description" className="sm:col-span-2">
                <Textarea rows={2} value={categoryForm.description} onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))} />
              </FieldShell>
            </div>
            <div className="mt-4 flex flex-col gap-4 border-t border-border px-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <Switch id="pricing-category-active" checked={categoryForm.active} onCheckedChange={(active) => setCategoryForm((current) => ({ ...current, active }))} />
                <label htmlFor="pricing-category-active" className="text-sm font-medium">Visible on public pricing</label>
              </div>
              <div className="flex gap-2 sm:justify-end">
                <Button type="button" variant="outline" size="touch" onClick={() => setEditingCategoryId(null)} disabled={Boolean(pendingAction)} className="flex-1 sm:flex-none">Cancel</Button>
                <Button type="submit" size="touch" disabled={Boolean(pendingAction)} className="flex-1 sm:flex-none">
                  {pendingAction.startsWith("category-") ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  {pendingAction.startsWith("category-") ? "Saving category..." : "Save category"}
                </Button>
              </div>
            </div>
          </form>
        ) : null}

        {editingServiceId === "new" ? (
          <ServiceItemEditor categories={visibleCategories.filter((category) => category.active !== false)} saving={pendingAction === "service-new"} onSave={(payload) => saveService(null, payload)} onCancel={() => setEditingServiceId(null)} />
        ) : null}

        <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-[1fr_180px]">
          <label className="relative block">
            <span className="sr-only">Search services</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services" className="h-11 pl-9" />
          </label>
          <label>
            <span className="sr-only">Filter by visibility</span>
            <select value={visibility} onChange={(event) => setVisibility(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">All services</option>
              <option value="active">Public only</option>
              <option value="hidden">Hidden only</option>
            </select>
          </label>
        </div>

        {servicesQuery.error && services.length ? <ErrorState title="Latest service changes could not be loaded" description="Previously loaded services remain visible." error={servicesQuery.error} onRetry={servicesQuery.refetch} /> : null}
        {categoriesQuery.error && (categories.length || services.length) ? <ErrorState title="Latest category changes could not be loaded" description={categories.length ? "Previously loaded categories remain visible." : "Services remain available without their usual category grouping."} error={categoriesQuery.error} onRetry={categoriesQuery.refetch} /> : null}

        {isLoading ? (
          <CardSkeleton count={4} className="md:grid-cols-1 xl:grid-cols-1" />
        ) : servicesQuery.error && !services.length ? (
          <ErrorState title="Service pricing could not be loaded" error={servicesQuery.error} onRetry={servicesQuery.refetch} />
        ) : categoriesQuery.error && !categories.length && !services.length ? (
          <ErrorState title="Service categories could not be loaded" error={categoriesQuery.error} onRetry={categoriesQuery.refetch} />
        ) : !services.length && !hasFilters ? (
          <EmptyState icon={Wrench} title="No services have been added" description="Add the first service to publish clear standard pricing for customers." action={<Button type="button" onClick={() => setEditingServiceId("new")}><Plus /> Add service</Button>} />
        ) : !filteredServices.length ? (
          <NoResultsState title="No services match these filters" description="Clear the search or visibility filter to see the full service list." onClear={clearFilters} />
        ) : (
          <div className="space-y-7">
            {groupedServices.map(({ category, items }) => items.length ? (
              <PricingGroup
                key={category.id || category.key}
                category={category}
                items={items}
                editingServiceId={editingServiceId}
                pendingAction={pendingAction}
                categories={visibleCategories.filter((entry) => entry.active !== false)}
                onEditCategory={() => startCategory(category)}
                onToggleCategory={() => toggleCategory(category)}
                onEditService={setEditingServiceId}
                onSaveService={saveService}
                onCancelService={() => setEditingServiceId(null)}
                onToggleService={toggleService}
              />
            ) : null)}
            {uncategorised.length ? (
              <PricingGroup
                category={{ key: "", name: "Uncategorised", active: true }}
                items={uncategorised}
                editingServiceId={editingServiceId}
                pendingAction={pendingAction}
                categories={visibleCategories.filter((entry) => entry.active !== false)}
                onEditService={setEditingServiceId}
                onSaveService={saveService}
                onCancelService={() => setEditingServiceId(null)}
                onToggleService={toggleService}
              />
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * @param {{ category: Record<string, any>, items: Array<Record<string, any>>, editingServiceId: string | null, pendingAction: string, categories: Array<Record<string, any>>, onEditCategory?: () => void, onToggleCategory?: () => void, onEditService: (id: string) => void, onSaveService: (item: Record<string, any>, payload: Record<string, any>) => Promise<void>, onCancelService: () => void, onToggleService: (item: Record<string, any>) => Promise<void> }} props
 */
function PricingGroup({ category, items, editingServiceId, pendingAction, categories, onEditCategory, onToggleCategory, onEditService, onSaveService, onCancelService, onToggleService }) {
  return (
    <section aria-labelledby={`pricing-group-${category.id || "uncategorised"}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`pricing-group-${category.id || "uncategorised"}`} className="font-heading text-lg font-bold">{category.name}</h2>
            {category.active === false ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Hidden</span> : null}
          </div>
          {category.description ? <p className="mt-1 text-sm text-muted-foreground">{category.description}</p> : null}
        </div>
        {onEditCategory ? (
          <div className="flex gap-1 self-start">
            <Button type="button" variant="ghost" size="iconTouch" onClick={onEditCategory} disabled={Boolean(pendingAction)} aria-label={`Edit ${category.name}`}><Pencil aria-hidden="true" /></Button>
            <Button type="button" variant="ghost" size="iconTouch" onClick={onToggleCategory} disabled={Boolean(pendingAction)} aria-label={category.active === false ? `Restore ${category.name}` : `Hide ${category.name}`}>
              {pendingAction === `toggle-category-${category.id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : category.active === false ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="divide-y divide-border border-y border-border">
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:px-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{item.name}</h3>
                  {item.active === false ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Hidden</span> : null}
                </div>
                {item.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</p> : null}
              </div>
              <p className="shrink-0 font-heading font-bold">{formatPrice(item.price)}</p>
              <div className="flex gap-1 self-end sm:self-auto">
                <Button type="button" variant="ghost" size="iconTouch" onClick={() => onEditService(item.id)} disabled={Boolean(pendingAction)} aria-label={`Edit ${item.name}`}><Pencil aria-hidden="true" /></Button>
                <Button type="button" variant="ghost" size="iconTouch" onClick={() => onToggleService(item)} disabled={Boolean(pendingAction)} aria-label={item.active === false ? `Restore ${item.name}` : `Hide ${item.name}`}>
                  {pendingAction === `toggle-service-${item.id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : item.active === false ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                </Button>
              </div>
            </div>
            {editingServiceId === item.id ? (
              <ServiceItemEditor item={item} categories={categories} saving={pendingAction === `service-${item.id}`} onSave={(payload) => onSaveService(item, payload)} onCancel={onCancelService} />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
