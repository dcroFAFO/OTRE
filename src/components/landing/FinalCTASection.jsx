import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

export default function FinalCTASection() {
  return (
    <section className="relative py-24 sm:py-32 border-t border-border/70 overflow-hidden">
      <img
        src="https://media.base44.com/images/public/6a2069bac12b203bbb93b0b3/616e15808_generated_image.png"
        alt="Electric scooter in motion illustration"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/60" />
      <div className="relative mx-auto max-w-4xl px-5 sm:px-8 text-center">
        <ScrollReveal>
          <h2 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Ready to Get Back On The Run?
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
            Book your electric scooter repair with On The Run Electrics and get your ride checked, repaired, and ready to move again.
          </p>
          <Link to="/book" className="mt-8 inline-flex">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl shadow-lg shadow-accent/20">
              Book a Repair <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}