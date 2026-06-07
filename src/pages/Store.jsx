import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, Zap, Package } from "lucide-react";
import { CartProvider, useCart } from "@/lib/CartContext";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { ALL_CATEGORIES } from "@/config/storeConfig";
import ProductCard from "@/components/store/ProductCard";
import StoreCategoryNav from "@/components/store/StoreCategoryNav";
import CartDrawer from "@/components/store/CartDrawer";
import CheckoutDialog from "@/components/store/CheckoutDialog";

function StoreInner() {
  const { data: { business } } = usePlatformConfig();
  const { count } = useCart();
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products"],
    queryFn: () => base44.entities.Product.filter({ active: true }, "order", 500),
    initialData: [],
  });

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

  return (
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
          <Button variant="outline" size="icon" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs grid place-items-center font-medium">
                {count}
              </span>
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
          <StoreCategoryNav activeCategory={activeCategory} onSelect={setActiveCategory} />
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-6">
            <h1 className="font-heading font-extrabold text-2xl">{activeLabel}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "Loading..." : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {!isLoading && filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No products found{activeCategory ? " in this category" : ""}.</p>
            </div>
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
    </div>
  );
}

export default function Store() {
  return (
    <CartProvider>
      <StoreInner />
    </CartProvider>
  );
}