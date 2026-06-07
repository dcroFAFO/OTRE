import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { useCart } from "@/lib/CartContext";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const price = Number(product.price || 0);

  return (
    <Card className="group flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full grid place-items-center text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug line-clamp-2">{product.name}</h3>
          {!product.in_stock && <Badge variant="outline" className="shrink-0 text-xs">Sold out</Badge>}
        </div>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-heading font-bold">
            {price > 0 ? `$${price.toFixed(2)}` : "POA"}
          </span>
          <Button
            size="sm"
            disabled={!product.in_stock}
            onClick={() => addItem(product)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </Card>
  );
}