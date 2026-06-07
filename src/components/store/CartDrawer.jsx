import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/CartContext";

export default function CartDrawer({ open, onOpenChange, onCheckout }) {
  const { items, updateQty, removeItem, subtotal } = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center text-muted-foreground">
            <div>
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto -mx-6 px-6 divide-y">
              {items.map((i) => (
                <div key={i.product.id} className="py-4 flex gap-3">
                  <div className="h-16 w-16 rounded-md bg-muted overflow-hidden shrink-0">
                    {i.product.image_url && (
                      <img src={i.product.image_url} alt={i.product.name} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{i.product.name}</p>
                    <p className="text-xs text-muted-foreground">${Number(i.product.price || 0).toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i.product.id, i.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm w-6 text-center">{i.qty}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(i.product.id, i.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-muted-foreground" onClick={() => removeItem(i.product.id)}>
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
              <p className="text-xs text-muted-foreground">Shipping calculated at fulfilment. Orders are forwarded to eScootNow.</p>
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