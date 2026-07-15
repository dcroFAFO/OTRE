import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BatteryWarning, CircleDot, Disc, Gauge, PlugZap, Power, TriangleAlert, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ISSUES = [
  [Power, "Won’t turn on"], [PlugZap, "Won’t charge"], [BatteryWarning, "Cuts out while riding"],
  [Disc, "Weak or noisy brakes"], [CircleDot, "Flat or damaged tyre"], [Gauge, "Reduced battery range"],
  [TriangleAlert, "Error codes"], [Volume2, "Grinding or rattling"],
];

export default function MobileIssuesSection() {
  return (
    <section id="common-issues" className="border-y border-border bg-card/55 px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Common scooter problems</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight">Not sure what is wrong? Start here.</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">We inspect the likely causes, explain the issue clearly and recommend the most sensible repair path.</p>
        <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {ISSUES.map(([Icon, label]) => <div key={label} className="rounded-2xl border border-border bg-card p-4"><Icon className="h-5 w-5 text-accent" aria-hidden="true" /><p className="mt-3 text-sm font-bold leading-snug">{label}</p></div>)}
        </div>
        <Link to="/book" className="mt-7 block sm:inline-flex"><Button className="h-12 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto">Describe your scooter issue <ArrowRight aria-hidden="true" /></Button></Link>
      </div>
    </section>
  );
}