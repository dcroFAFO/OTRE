import React from "react";

export default function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border pb-8 last:border-0">
      <h2 className="font-heading text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}