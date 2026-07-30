import React from "react";

function formatPrice(price) {
  const n = Number(price) || 0;
  if (n <= 0) return null;
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

export default function PricingCategoryCard({ category, items }) {
  return (
    <section className="rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl sm:p-8">
      <h2 className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">{category.name}</h2>
      {category.description && <p className="mt-1.5 text-sm text-muted-foreground">{category.description}</p>}
      <ul className="mt-5 divide-y divide-border">
        {items.map((item) => {
          const price = formatPrice(item.price);
          return (
            <li key={item.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{item.name}</p>
                {item.description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
              </div>
              <div className="shrink-0 text-right">
                {price ? (
                  <span className="font-heading text-lg font-bold text-foreground">{price}</span>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">Quote on assessment</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}