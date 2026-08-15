import React, { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, SearchX, SlidersHorizontal, Zap } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { ALL_CATEGORIES } from "@/config/storeConfig";
import ProductCard from "@/components/store/ProductCard";
import StoreCategoryNav from "@/components/store/StoreCategoryNav";
import SEO from "@/components/SEO";
import { getStoreSchema } from "@/lib/structuredData";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listPublicCatalog } from "@/services/catalogService";

function StoreInner() {
  const { data: { business } } = usePlatformConfig();
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());

  const {
    data: catalog,
    isLoading,
    error: productsError,
    refetch: refetchProducts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["publicCatalog", activeCategory || "all", deferredSearch.toLowerCase()],
    queryFn: ({ pageParam }) => listPublicCatalog({
      page: pageParam,
      pageSize: 48,
      category: activeCategory || "",
      search: deferredSearch,
    }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.page + 1 : undefined,
  });
  const products = useMemo(() => catalog?.pages.flatMap((page) => page.items || []) || [], [catalog]);
  const potentiallyTruncated = catalog?.pages.some((page) => page.potentially_truncated) || false;

  const activeLabel = activeCategory
    ? ALL_CATEGORIES.find((c) => c.key === activeCategory)?.label || "Products"
    : "All products";

  const storeTitle = activeCategory ? `${activeLabel} | On The Run Electrics Store` : "Scooter Parts & Accessories | On The Run Electrics";
  const storeDescription = activeCategory
    ? `Browse ${activeLabel.toLowerCase()} selected by On The Run Electrics for reliable electric scooter repairs, servicing, maintenance and upgrades.`
    : "Browse electric scooter parts, accessories and service items selected by On The Run Electrics for reliable repairs, servicing and maintenance.";

  return (
    <>
      <SEO
        title={storeTitle}
        description={storeDescription}
        canonical="/store"
        ogType="website"
        structuredData={getStoreSchema(business)}
      />
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center gap-4">
          <Link to="/" className="flex min-h-11 items-center gap-2 shrink-0" aria-label={`${business.name} home`}>
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground">
              <Zap className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="font-heading font-extrabold text-lg tracking-tight hidden sm:block">{business.name}</span>
          </Link>
           <label className="relative flex-1 max-w-md ml-auto">
             <span className="sr-only">Search products</span>
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
             <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-9" />
           </label>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
          <StoreCategoryNav activeCategory={activeCategory} onSelect={setActiveCategory} />
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading font-extrabold text-2xl">{activeLabel}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Browse the workshop catalogue and enquire about availability. Purchases and payment are arranged directly with the team.</p>
            <p className="text-xs text-muted-foreground mt-1">
                {isLoading ? "Loading products" : `${products.length} product${products.length === 1 ? "" : "s"}${hasNextPage ? " shown" : ""}`}
            </p>
            </div>
            <Button variant="outline" className="min-h-11 lg:hidden" onClick={() => setCategoryOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Categories
            </Button>
          </div>

          {productsError && products.length === 0 ? (
            <ErrorState title="Products could not be loaded" error={productsError} onRetry={refetchProducts} />
          ) : isLoading ? (
            <CardSkeleton count={8} />
          ) : products.length === 0 && !search && !activeCategory ? (
            <EmptyState title="No products are published" description="The catalogue is currently empty. You can still contact the workshop for parts and repair advice." action={<Button asChild variant="outline"><Link to="/contact">Contact workshop</Link></Button>} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="No products match"
              description={search ? `No products match “${search}”${activeCategory ? ` in ${activeLabel}` : ""}.` : `There are no products in ${activeLabel}.`}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {search && <Button variant="outline" onClick={() => setSearch("")}>Clear search</Button>}
                  {activeCategory && <Button variant="outline" onClick={() => setActiveCategory(null)}>All products</Button>}
                  <Button variant="ghost" className="lg:hidden" onClick={() => setCategoryOpen(true)}>Choose category</Button>
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {productsError && products.length > 0 ? (
            <ErrorState className="mt-5" title="More products could not be loaded" error={productsError} onRetry={fetchNextPage} />
          ) : null}
          {potentiallyTruncated ? (
            <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
              The catalogue is large, so some products may not appear in this view. Contact the workshop if you cannot find an item.
            </p>
          ) : null}
          {hasNextPage ? (
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="outline" size="touch" disabled={isFetchingNextPage} aria-busy={isFetchingNextPage} onClick={() => fetchNextPage()}>
                {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {isFetchingNextPage ? "Loading more" : "Load more products"}
              </Button>
            </div>
          ) : null}
        </main>
      </div>

      <Sheet open={categoryOpen} onOpenChange={setCategoryOpen}>
        <SheetContent side="left" className="w-[min(88vw,22rem)]">
          <SheetHeader><SheetTitle>Product categories</SheetTitle></SheetHeader>
          <div className="mt-5">
            <StoreCategoryNav
              activeCategory={activeCategory}
              onSelect={(category) => {
                setActiveCategory(category);
                setCategoryOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </>
  );
}

export default function Store() {
  return <StoreInner />;
}
