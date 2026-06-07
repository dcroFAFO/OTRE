import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCart } from "@/lib/CartContext";
import { SUPPLIER_NAME } from "@/config/storeConfig";

export default function CheckoutDialog({ open, onOpenChange }) {
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    shipping_address: "", fulfilment_method: "delivery", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const reference = `ORD-${Date.now().toString().slice(-6)}`;
    const order = await base44.entities.Order.create({
      reference,
      ...form,
      items: items.map((i) => ({
        product_id: i.product.id, name: i.product.name, sku: i.product.sku,
        qty: i.qty, price: Number(i.product.price || 0),
      })),
      subtotal, total: subtotal, currency: "AUD",
      status: "received", supplier: SUPPLIER_NAME,
    });
    setDone(order);
    clear();
    setSubmitting(false);
  };

  const close = () => { setDone(null); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="max-w-lg">
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-lg">Order received!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Reference <span className="font-medium">{done.reference}</span>. Your order has been logged and will be forwarded to {SUPPLIER_NAME}.
            </p>
            <Button className="mt-5" onClick={close}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader><DialogTitle>Checkout</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Full name" required>
                  <Input required value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
                </Field>
                <Field label="Phone" required>
                  <Input required value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
                </Field>
              </div>
              <Field label="Email" required>
                <Input type="email" required value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} />
              </Field>
              <Field label="Fulfilment">
                <Select value={form.fulfilment_method} onValueChange={(v) => set("fulfilment_method", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="click_collect">Click & Collect (Brisbane)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.fulfilment_method === "delivery" && (
                <Field label="Shipping address" required>
                  <Textarea required value={form.shipping_address} onChange={(e) => set("shipping_address", e.target.value)} />
                </Field>
              )}
              <Field label="Notes (optional)">
                <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
              <div className="flex items-center justify-between pt-2">
                <span className="font-heading font-semibold">Total: ${subtotal.toFixed(2)}</span>
                <Button type="submit" disabled={submitting || items.length === 0} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Place order
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}