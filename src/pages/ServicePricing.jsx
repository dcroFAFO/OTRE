import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Zap, ArrowRight, Wrench } from "lucide-react";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import PricingCategoryCard from "@/components/pricing/PricingCategoryCard";
import { getServicePricingSchema } from "@/lib/structuredData";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";

export default function ServicePricing() {
  const { data: { business } } = usePlatformConfig();
  const servicesQuery = useQuery({
    queryKey: ["pricingServices"],
    queryFn: () => base44.entities.ServiceItem.filter({ active: true }, "order", 200),
  });
  const categoriesQuery = useQuery({
    queryKey: ["pricingCategories"],
    queryFn: () => base44.entities.ServiceCategory.filter({ active: true }, "order", 100),
  });
  const services = servicesQuery.data || [];
  const categories = categoriesQuery.data || [];
  const isLoading = servicesQuery.isLoading || categoriesQuery.isLoading;

  const grouped = categories
    .map((c) => ({ category: c, items: services.filter((s) => s.category_key === c.key) }))
    .filter((g) => g.items.length > 0);
  const uncategorised = services.filter((s) => !categories.some((c) => c.key === s.category_key));
  const isEmpty = !isLoading && !servicesQuery.isError && services.length === 0;

  return (
    <>
      <SEO
        title="Service Pricing | Electric Scooter Repairs Brisbane"
        description="Transparent pricing for electric scooter repairs, servicing and diagnostics at On The Run Electrics in Woolloongabba, Brisbane."
        canonical="/service-pricing"
        structuredData={getServicePricingSchema(business)}
      />
      <div className="min-h-screen bg-background text-foreground">
        <LandingParallaxBackground />
        <LandingNav />

        <main id="main-content" className="relative z-10 px-5 pb-16 pt-28 sm:px-8 sm:pb-24 sm:pt-32">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
              <Zap className="h-3.5 w-3.5" /> Service pricing
            </span>
            <h1 className="mt-5 font-heading text-4xl font-extrabold sm:text-5xl">
              Clear pricing for scooter repairs &amp; servicing
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Standard pricing for our most common electric scooter services. Final costs are confirmed after we assess your scooter — request a booking and we&apos;ll provide a clear, upfront quote before any work begins.
            </p>

            {isLoading ? (
              <CardSkeleton count={3} className="mt-10 xl:grid-cols-1" />
            ) : servicesQuery.isError && services.length === 0 ? (
              <ErrorState className="mt-10" error={servicesQuery.error} title="Service pricing could not be loaded" onRetry={() => servicesQuery.refetch()} />
            ) : isEmpty ? (
              <EmptyState
                className="mt-10 border-y border-border"
                icon={Wrench}
                title="Pricing is being updated"
                description="You can still request a repair assessment or contact the workshop for a quote."
                action={<div className="flex flex-col gap-2 sm:flex-row"><Button asChild><Link to="/book">Request a booking</Link></Button><Button asChild variant="outline"><Link to="/contact">Contact the workshop</Link></Button></div>}
              />
            ) : (
              <div className="mt-10 space-y-6">
                {servicesQuery.isError ? <ErrorState error={servicesQuery.error} title="Latest service prices could not be refreshed" description="Previously loaded prices remain visible below." onRetry={() => servicesQuery.refetch()} /> : null}
                {categoriesQuery.isError ? <ErrorState error={categoriesQuery.error} title="Service categories could not be loaded" description="Prices are shown below without their usual categories." onRetry={() => categoriesQuery.refetch()} /> : null}
                {grouped.map(({ category, items }) => (
                  <PricingCategoryCard key={category.key} category={category} items={items} />
                ))}
                {uncategorised.length > 0 && (
                  <PricingCategoryCard category={{ name: "Other services" }} items={uncategorised} />
                )}
              </div>
            )}

            <section className="mt-12 border-t border-border py-10 text-center" aria-labelledby="pricing-help-heading">
              <h2 id="pricing-help-heading" className="font-heading text-2xl font-extrabold">Not sure what you need?</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Book a repair request and our team will assess your scooter and provide a clear, upfront quote — no payment required to book.</p>
              <Button asChild className="mt-6 h-11 px-6">
                <Link to="/book">Request a repair booking <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </section>
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
