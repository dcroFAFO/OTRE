import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

export default function FinalCTASection() {
  return (
    <section className="border-t border-border/70 bg-card/35 py-14 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 text-left sm:px-8 sm:text-center">
        <ScrollReveal>
          <h2 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Ready to Get Back On The Run?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Book your electric scooter repair with On The Run Electrics and get your ride checked, repaired, and ready to move again.
          </p>
          <Link to="/book" className="mt-7 block sm:mt-8 sm:inline-flex">
            <Button size="lg" className="h-12 w-full gap-2 rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20 hover:bg-accent/90 sm:h-10 sm:w-auto">
              Book a Repair <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}