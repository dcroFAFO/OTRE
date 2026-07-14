import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import LandingLogo from "@/components/landing/LandingLogo";
import { cn } from "@/lib/utils";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: { app } } = usePlatformConfig();

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = app.landing.navLinks.map((link) => {
    if (link.href.startsWith("#")) return { ...link, href: `/${link.href}` };
    if (link.href === "/blog") return { ...link, label: "News and Events" };
    return link;
  });

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm" : "bg-background/70 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-8">
        <Link to="/" className="flex items-center" aria-label="On The Road home">
          <LandingLogo imageClassName="h-10 sm:h-14" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            l.href.startsWith("/") ? (
              <Link key={l.href} to={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            )
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link to="/portal"><Button variant="ghost" size="sm">{app.landing.portalLabel}</Button></Link>
          <Link to="/book"><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">Book a Repair</Button></Link>
        </div>

        <button className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-card/80 transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open && (
        <div id="mobile-navigation" className="space-y-2 border-b border-border bg-background/95 px-4 pb-5 pt-3 shadow-xl backdrop-blur-xl md:hidden">
          {links.map((l) => (
            l.href.startsWith("/") ? (
              <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-base font-semibold text-foreground transition-colors hover:bg-accent/10">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-xl px-3 text-base font-semibold text-foreground transition-colors hover:bg-accent/10">
                {l.label}
              </a>
            )
          ))}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <Link to="/portal"><Button variant="outline" className="h-12 w-full rounded-xl">Login</Button></Link>
            <Link to="/book"><Button className="h-12 w-full rounded-xl bg-accent text-accent-foreground">Book a Repair</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}