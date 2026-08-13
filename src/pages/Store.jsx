import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, SearchX, SlidersHorizontal, Zap } from "lucide-react";
import { CartProvider, useCart } from "@/lib/CartContext";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { ALL_CATEGORIES } from "@/config/storeConfig";
import ProductCard from "@/components/store/ProductCard";
import StoreCategoryNav from "@/components/store/StoreCategoryNav";
import CartDrawer from "@/components/store/CartDrawer";
import CheckoutDialog from "@/components/store/CheckoutDialog";
import SEO from "@/components/SEO";
import { getStoreSchema } from "@/lib/structuredData";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import PaymentResultAlert from "@/components/store/PaymentResultAlert";
import { verifyCheckoutStatus } from "@/services/paymentService";
import { getSafeErrorMessage } from "@/lib/errors";

function StoreInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: { business } } = usePlatformConfig();
  const { count, reconcile, releaseCheckoutAttempt, clearAfterVerifiedCheckout } = useCart();
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const { data: products = [], isLoading, isSuccess, error: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ["store-products"],
    queryFn: () => base44.entities.Product.filter({ active: true }, "order", 500),
  });

  const paymentParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      result: params.get("payment") || "",
      sessionId: params.get("session_id") || "",
      orderId: params.get("order") || "",
      attemptId: params.get("attempt") || "",
    };
  }, [location.search]);

  const paymentVerification = useQuery({
    queryKey: ["storeCheckoutStatus", paymentParams.sessionId, paymentParams.orderId, paymentParams.attemptId],
    queryFn: () => verifyCheckoutStatus({
      flow: "store",
      sessionId: paymentParams.sessionId,
      orderId: paymentParams.orderId,
      checkoutAttemptId: paymentParams.attemptId,
    }),
    enabled: paymentParams.result === "success" && !!paymentParams.sessionId && !!paymentParams.orderId,
    staleTime: 0,
  });

  useEffect(() => {
    if (isSuccess) reconcile(products);
  }, [isSuccess, products, reconcile]);

  useEffect(() => {
    if (paymentParams.result === "cancelled" && paymentParams.attemptId) {
      releaseCheckoutAttempt(paymentParams.attemptId);
    }
  }, [paymentParams.result, paymentParams.attemptId, releaseCheckoutAttempt]);

  useEffect(() => {
    if (paymentVerification.data?.status === "paid") {
      clearAfterVerifiedCheckout(paymentVerification.data.checkoutAttemptId || paymentParams.attemptId);
    }
  }, [paymentVerification.data, paymentParams.attemptId, clearAfterVerifiedCheckout]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCategory && p.category_key !== activeCategory) return false;
      if (q && !`${p.name} ${p.description || ""} ${p.sku || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, activeCategory, search]);

  const activeLabel = activeCategory
    ? ALL_CATEGORIES.find((c) => c.key === activeCategory)?.label || "Products"
    : "All products";

  const storeTitle = activeCategory ? `${activeLabel} | On The Run Electrics Store` : "Scooter Parts & Accessories | On The Run Electrics";
  const storeDescription = activeCategory
    ? `Browse ${activeLabel.toLowerCase()} selected by On The Run Electrics for reliable electric scooter repairs, servicing, maintenance and upgrades.`
    : "Shop electric scooter parts, accessories and service items selected by On The Run Electrics for reliable repairs, servicing and maintenance.";

  const dismissPaymentResult = () => navigate("/store", { replace: true });
  /** @type {"" | "verifying" | "success" | "cancelled" | "pending" | "error"} */
  let paymentState = "";
  if (paymentParams.result === "cancelled") paymentState = "cancelled";
  if (paymentParams.result === "success") {
    if (!paymentParams.sessionId || !paymentParams.orderId) paymentState = "error";
    else if (paymentVerification.isLoading) paymentState = "verifying";
    else if (paymentVerification.error) paymentState = "error";
    else if (paymentVerification.data?.status === "paid") paymentState = "success";
    else paymentState = "pending";
  }

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
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="grid place-items-center h-9 w-9 rounded-xl bg-primary text-primary-foreground">
              <Zap className="h-5 w-5 text-accent" />
            </span>
            <span className="font-heading font-extrabold text-lg tracking-tight hidden sm:block">{business.name}</span>
          </Link>
          <div className="relative flex-1 max-w-md ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="icon" className="relative" aria-label={`Open cart${count > 0 ? ` (${count} items)` : ""}`} onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs grid place-items-center font-medium">
                {count}
              </span>
            )}
          </Button>
        </div>
      </header>

      {paymentState && (
        <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
          <PaymentResultAlert
            status={paymentState}
            description={paymentVerification.error ? getSafeErrorMessage(paymentVerification.error, "Payment could not be verified. Your cart has been kept.") : undefined}
            reference={paymentVerification.data?.reference}
            onRetry={["error", "pending"].includes(paymentState) && paymentParams.sessionId ? () => paymentVerification.refetch() : undefined}
            onDismiss={paymentState !== "verifying" ? dismissPaymentResult : undefined}
          />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
          <StoreCategoryNav activeCategory={activeCategory} onSelect={setActiveCategory} />
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading font-extrabold text-2xl">{activeLabel}</h1>
            <p className="text-sm text-muted-foreground mt-1">
                {isLoading ? "Loading products" : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
            </p>
            </div>
            <Button variant="outline" className="lg:hidden" onClick={() => setCategoryOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Categories
            </Button>
          </div>

          {productsError ? (
            <ErrorState title="Products could not be loaded" error={productsError} onRetry={refetchProducts} />
          ) : isLoading ? (
            <CardSkeleton count={8} />
          ) : products.length === 0 ? (
            <EmptyState title="No products are published" description="The catalogue is currently empty. You can still contact the workshop for parts and repair advice." action={<Button asChild variant="outline"><Link to="/contact">Contact workshop</Link></Button>} />
          ) : filtered.length === 0 ? (
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
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </main>
      </div>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
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
  return (
    <CartProvider>
      <StoreInner />
    </CartProvider>
  );
}
