import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Wrench, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import TutorialBubble from "@/components/portal/tutorial/TutorialBubble";

// All data in this file is mock/tutorial-only. Nothing here reads or writes real records.

const MILESTONES = ["Booking Received", "Job Booked", "Repair Underway", "Ready for Pickup", "Invoice Issued", "Paid", "Completed"];

const MOCK_INVOICES = [
  { id: "m1", number: "INV-1042", amount: 145, status: "paid", date: "12 Mar 2026" },
  { id: "m2", number: "INV-1130", amount: 89, status: "paid", date: "28 Apr 2026" },
  { id: "m3", number: "INV-1218", amount: 210, status: "paid", date: "2 Jun 2026" },
  { id: "m4", number: "INV-1305", amount: 165, status: "outstanding", date: "1 Jul 2026", items: [{ d: "Front tyre replacement", total: 95 }, { d: "Labour (1 hr)", total: 70 }] },
];

const MOCK_HISTORY = [
  { id: "h1", label: "Xiaomi Pro 2", issue: "Flat tyre repair", ref: "OTR-2201", date: "12 Mar 2026" },
  { id: "h2", label: "Xiaomi Pro 2", issue: "Brake adjustment & service", ref: "OTR-2289", date: "28 Apr 2026" },
  { id: "h3", label: "Xiaomi Pro 2", issue: "Battery health check", ref: "OTR-2377", date: "2 Jun 2026" },
];

function StatusAnimation() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % MILESTONES.length), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <ol className="py-2">
      {MILESTONES.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={label} className="relative flex gap-4 pb-4 last:pb-0">
            {i < MILESTONES.length - 1 && <div className={`absolute bottom-0 left-[13px] top-7 w-0.5 ${done || current ? "bg-primary/40" : "bg-border"}`} />}
            <div className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500 ${current ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : current ? <Wrench className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-40" />}
            </div>
            <p className={`pt-1 text-sm font-medium ${current ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground"}`}>{label}</p>
          </li>
        );
      })}
    </ol>
  );
}

function InvoicesMock() {
  return (
    <div className="space-y-3 py-2">
      {MOCK_INVOICES.map((inv) => {
        const isPaid = inv.status === "paid";
        return (
          <div key={inv.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">Invoice {inv.number}</span>
              <Badge variant="outline" className={`text-xs capitalize ${isPaid ? "border-emerald-300 text-emerald-600" : "border-rose-300 text-rose-500"}`}>{inv.status}</Badge>
            </div>
            {!isPaid && inv.items && (
              <div className="space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
                {inv.items.map((li) => (
                  <div key={li.d} className="flex justify-between"><span>{li.d}</span><span>AUD ${li.total.toFixed(2)}</span></div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs text-muted-foreground">{inv.date}</span>
              <span className="text-sm font-bold text-foreground">AUD ${inv.amount.toFixed(2)}</span>
            </div>
            {!isPaid && (
              <Button disabled className="w-full gap-2 bg-emerald-600 text-white opacity-80"><CreditCard className="h-4 w-4" /> Pay securely with Stripe</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HistoryMock() {
  return (
    <ul className="space-y-3 py-2">
      {MOCK_HISTORY.map((j) => (
        <li key={j.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{j.label}</p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{j.issue}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{j.ref} · {j.date}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">Completed</Badge>
        </li>
      ))}
    </ul>
  );
}

const BUBBLES = {
  status: { title: "Track your job status", text: "This is where you can check the status of your job — watch it move through each stage from booking to completion. (This is just a demo — your real job isn't changing.)" },
  invoices: { title: "Review and settle invoices", text: "The Invoices tab is where you can review invoices from our technicians and securely pay any outstanding balance. (These are example invoices.)" },
  history: { title: "Your ride's log book", text: "The History tab tracks every job on your ride — like a mechanic's log book for your scooter. (These are example jobs.)" },
};

export default function TutorialMockJobModal({ step, onNext, onClose }) {
  const tab = step === 2 ? "status" : step === 3 ? "invoices" : "history";
  const bubble = BUBBLES[tab];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg font-extrabold">
            <span>Xiaomi Pro 2</span>
            <span className="text-xs font-normal text-muted-foreground">#OTR-DEMO</span>
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mb-1 grid w-full grid-cols-3">
            <TabsTrigger value="status" className="pointer-events-none text-xs">Status</TabsTrigger>
            <TabsTrigger value="invoices" className="pointer-events-none text-xs">Invoices</TabsTrigger>
            <TabsTrigger value="history" className="pointer-events-none text-xs">History</TabsTrigger>
          </TabsList>
          <div className="flex-1 overflow-y-auto pr-1">
            {tab === "status" && <StatusAnimation />}
            {tab === "invoices" && <InvoicesMock />}
            {tab === "history" && <HistoryMock />}
          </div>
        </Tabs>
        <TutorialBubble title={bubble.title} text={bubble.text} onNext={onNext} onClose={onClose} nextLabel={tab === "history" ? "Finish" : "Next"} className="mt-2 max-w-none" />
      </DialogContent>
    </Dialog>
  );
}