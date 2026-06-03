import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, CreditCard, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "./ScrollReveal";

const MOCK_JOBS = [
  { ref: "OTR-1042", label: "Segway Ninebot Max G30", status: "Repair in progress", color: "bg-teal-500", dot: "teal" },
  { ref: "OTR-1038", label: "Xiaomi M365 Pro",        status: "Ready for pickup",   color: "bg-emerald-500", dot: "emerald" },
  { ref: "OTR-1035", label: "Kaabo Wolf Warrior",     status: "Invoice outstanding", color: "bg-rose-500",  dot: "rose" },
];

const DOT_COLORS = {
  teal:    "bg-teal-500",
  emerald: "bg-emerald-500",
  rose:    "bg-rose-500",
};

export default function PortalPreviewSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      {/* Accent glow */}
      <div className="absolute top-1/2 -translate-y-1/2 right-0 h-96 w-96 rounded-full bg-accent/8 blur-[80px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: copy */}
        <ScrollReveal>
          <span className="text-sm font-semibold text-accent tracking-wide uppercase">Customer Portal</span>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-lg">
            Track your repair from your phone
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-md">
            Every job has its own live status. Approve quotes, check progress, and know the moment your scooter is ready — no phone calls needed.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              { icon: CheckCircle2, text: "Real-time job status updates" },
              { icon: Clock,        text: "Approve or decline quotes online" },
              { icon: CreditCard,   text: "View and pay invoices securely" },
              { icon: Wrench,       text: "Full repair history on file" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="grid place-items-center h-8 w-8 rounded-xl bg-accent/10 text-accent shrink-0">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <a href="#book">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl gap-2 shadow-lg shadow-accent/20">
                Book now <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </ScrollReveal>

        {/* Right: portal mock */}
        <ScrollReveal delay={0.15}>
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden"
          >
            {/* Mock browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-muted-foreground font-mono bg-background/80 rounded px-2 py-0.5">otrscooters.com/portal</span>
            </div>

            {/* Mock portal content */}
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Your active jobs</p>
              <div className="space-y-3">
                {MOCK_JOBS.map((job, i) => (
                  <motion.div
                    key={job.ref}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3.5 py-3"
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${DOT_COLORS[job.dot]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{job.label}</p>
                      <p className="text-[11px] text-muted-foreground">{job.ref}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{job.status}</span>
                  </motion.div>
                ))}
              </div>

              {/* Mock progress bar */}
              <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-foreground">OTR-1042 · Segway Ninebot</p>
                  <span className="text-[11px] text-teal-600 font-semibold bg-teal-50 rounded-full px-2 py-0.5">In Progress</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-teal-400 to-accent"
                    initial={{ width: "0%" }}
                    whileInView={{ width: "62%" }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">Step 5 of 8 — Repair in progress</p>
              </div>
            </div>
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}