import React from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  PlugZap,
  Power,
  Disc,
  Volume2,
  AlertTriangle,
  CircleDot,
  Gauge,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

const ISSUES = [
  { icon: Power, title: "Won't turn on", desc: "Complete power loss or dead display." },
  { icon: PlugZap, title: "Won't charge", desc: "Charging port or battery issues." },
  { icon: Power, title: "Cuts out while riding", desc: "Intermittent power or sudden shutdown." },
  { icon: Disc, title: "Weak brakes", desc: "Spongy or ineffective braking." },
  { icon: Volume2, title: "Unusual noises", desc: "Grinding, clicking or rattling sounds." },
  { icon: AlertTriangle, title: "Error codes", desc: "Dashboard warning or fault codes." },
  { icon: CircleDot, title: "Tyre damage", desc: "Punctures, wear or flat tyres." },
  { icon: Gauge, title: "Range loss", desc: "Battery not holding charge like it used to." },
];

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
        </ScrollReveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ISSUES.map((issue, i) => {
            const Icon = issue.icon;
            return (
              <motion.div
                key={issue.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:border-accent/30 hover:shadow-gentle hover:-translate-y-1 transition-all duration-200"
              >
                <span className="grid place-items-center h-10 w-10 rounded-xl bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-200">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-heading text-sm font-bold text-foreground leading-snug">{issue.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{issue.desc}</p>
              </motion.div>
            );
          })}
        </div>

        <ScrollReveal delay={0.15} className="mt-10">
          <p className="text-sm text-muted-foreground">
            Not every issue is obvious from the outside. We check the likely causes, explain what is going on, and recommend the most sensible fix.
          </p>
          <Link to="/book" className="mt-5 inline-flex">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl gap-2 shadow-lg shadow-accent/20">
              Book a diagnostic <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}