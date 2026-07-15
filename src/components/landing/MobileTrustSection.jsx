import React from "react";
import { MessageCircle, Smartphone, Star, Wrench } from "lucide-react";

const FEATURES = [
  [Wrench, "Scooter-focused repairs", "Practical work focused on the problem, without unnecessary extras."],
  [MessageCircle, "Clear communication", "Understand what needs attention, what can wait and what it may cost."],
  [Smartphone, "Online job tracking", "Check your repair status without needing to chase an update."],
];
const REVIEWS = [
  ["Booked online and always knew where things were at. My scooter was back on the road within a couple of days.", "Liam C."],
  ["Straightforward, no upselling, just a good repair. They diagnosed the charging issue and sorted it quickly.", "Priya S."],
];

export default function MobileTrustSection() {
  return (
    <section className="border-y border-border bg-card/55 px-4 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Why riders choose us</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight">Clear advice. Quality work. Less chasing.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {FEATURES.map(([Icon, title, text]) => <article key={title} className="rounded-2xl border border-border bg-card p-5"><Icon className="h-5 w-5 text-accent" aria-hidden="true" /><h3 className="mt-3 font-bold">{title}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p></article>)}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {REVIEWS.map(([quote, author]) => <figure key={author} className="rounded-2xl border border-border bg-card p-5"><div className="flex gap-0.5" aria-label="5 out of 5 stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent text-accent" aria-hidden="true" />)}</div><blockquote className="mt-3 text-sm leading-relaxed">“{quote}”</blockquote><figcaption className="mt-3 text-sm font-bold">{author}</figcaption></figure>)}
        </div>
      </div>
    </section>
  );
}