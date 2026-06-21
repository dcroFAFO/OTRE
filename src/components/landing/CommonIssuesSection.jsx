import React from "react";
import { AlertCircle } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

export default function CommonIssuesSection() {
  return (
    <section id="common-issues" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <ScrollReveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent tracking-wide uppercase">
            <AlertCircle className="h-4 w-4" /> Common Issues
          </span>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Common Issues We Fix
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed text-lg">
            If your scooter will not turn on, will not charge, cuts out while riding, feels unsafe, makes unusual noises, has weak brakes, loses range, or shows an error code, we can inspect it and advise on the best repair path.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Not every issue is obvious from the outside. We check the likely causes, explain what is going on, and recommend the most sensible fix.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}