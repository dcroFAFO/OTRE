import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Zap, ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import PricingCategoryCard from "@/components/pricing/PricingCategoryCard";
import { servicePricingSchema } from "@/lib/structuredData";

export default function ServicePricing() {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["pricingServices"],
    queryFn: () => base44.entities.ServiceItem.filter({ active: true }, "order", 200),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["pricingCategories"],
    queryFn: () => base44.entities.ServiceCategory.filter({ active: true }, "order", 100),
  });

  const grouped = categories
    .map((c) => ({ category: c, items: services.filter((s) => s.category_key === c.key) }))
    .filter((g) => g.items.length > 0);
  const uncategorised = services.filter((s) => !categories.some((c) => c.key === s.category_key));
  const isEmpty = !isLoading && grouped.length === 0 && uncategorised.length === 0;

  return (
    <>
      <SEO
        title="Service Pricing | Electric Scooter Repairs Brisbane"
        description="Transparent pricing for electric scooter repairs, servicing and diagnostics at On The Run Electrics in Woolloongabba, Brisbane."
        canonical="/service-pricing"
        structuredData={servicePricingSchema}
      />
      <main className="min-h-screen bg-background text-foreground">
        <LandingParallaxBackground />
        <LandingNav />

        <section className="relative z-10 px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
              <Zap className="h-3.5 w-3.5" /> Service pricing
            </span>
            <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              Clear pricing for scooter repairs &amp; servicing
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Standard pricing for our most common electric scooter services. Final costs are confirmed after we assess your scooter — request a booking and we&apos;ll provide a clear, upfront quote before any work begins.
            </p>

            {isLoading ? (
              <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-border border-t-accent rounded-full animate-spin" /></div>
            ) : isEmpty ? (
              <p className="py-16 text-center text-muted-foreground">Pricing is being updated. Please call us or request a booking for a quote.</p>
            ) : (
              <div className="mt-10 space-y-6">
                {grouped.map(({ category, items }) => (
                  <PricingCategoryCard key={category.key} category={category} items={items} />
                ))}
                {uncategorised.length > 0 && (
                  <PricingCategoryCard category={{ name: "Other services" }} items={uncategorised} />
                )}
              </div>
            )}

            <div className="mt-12 rounded-3xl border border-accent/20 bg-accent/5 p-8 text-center sm:p-10">
              <h2 className="font-heading text-2xl font-extrabold">Not sure what you need?</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Book a repair request and our team will assess your scooter and provide a clear, upfront quote — no payment required to book.</p>
              <Button asChild className="mt-6 h-11 rounded-xl bg-accent px-6 text-accent-foreground hover:bg-accent/90">
                <Link to="/book">Request a repair booking <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        <LandingFooter />
      </main>
    </>
  );
}