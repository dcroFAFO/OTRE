import React from "react";
import { Link } from "react-router-dom";

export default function NewsMasthead({ categories = [] }) {
  const today = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="border-y-4 border-foreground py-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{today}</p>
      <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight sm:text-6xl">News and Events</h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Electric scooter news, local events, repair advice and rider stories from On The Run Electrics.
      </p>
      {categories.length > 0 && (
        <nav aria-label="News categories" className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-border pt-4">
          {categories.map((category) => (
            <Link key={category.id} to={`/blog/category/${category.slug}`} className="text-sm font-bold hover:text-accent">
              {category.name}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}