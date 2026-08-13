import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/CartContext";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import EmptyState from "@/components/shared/EmptyState";

export default function CartDrawer({ open, onOpenChange, onCheckout }) {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const { data: { business } } = usePlatformConfig();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <EmptyState
            className="flex-1"
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Add a product before starting checkout."
            action={<Button variant="outline" onClick={() => onOpenChange(false)}>Browse products</Button>}
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 divide-y">
              {items.map((i) => (
                <div key={i.product.id} className="py-4 flex gap-3">
                  <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0">
                    {i.product.image_url && (
                      <img src={i.product.image_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{i.product.name}</p>
                    <p className="text-xs text-muted-foreground">${Number(i.product.price || 0).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="iconTouch" className="sm:h-8 sm:w-8" aria-label={`Decrease quantity of ${i.product.name}`} onClick={() => updateQty(i.product.id, i.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-6 text-center">{i.qty}</span>
                      <Button variant="outline" size="iconTouch" className="sm:h-8 sm:w-8" aria-label={`Increase quantity of ${i.product.name}`} onClick={() => updateQty(i.product.id, i.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="iconTouch" className="sm:h-8 sm:w-8 ml-auto text-muted-foreground" aria-label={`Remove ${i.product.name} from cart`} onClick={() => removeItem(i.product.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm font-medium">${(i.qty * Number(i.product.price || 0)).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between font-heading font-semibold">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">Click and collect from {business.address}. We will contact you when the order is ready for pickup.</p>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={onCheckout}>
                Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
