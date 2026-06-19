import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/landing/BrandLogo";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: { business, app } } = usePlatformConfig();

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

  const links = app.landing.navLinks;

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm" : "bg-background/70 backdrop-blur-md"
      )}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <BrandLogo className="h-11 w-20 sm:w-24 rounded-xl" />
          <span className="font-heading font-extrabold text-lg tracking-tight">{business.name}</span>
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
          <Link to="/book"><Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">Book Now</Button></Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background border-b border-border px-5 py-4 space-y-3">
          {links.map((l) => (
            l.href.startsWith("/") ? (
              <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-muted-foreground">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-sm font-medium text-muted-foreground">
                {l.label}
              </a>
            )
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/portal" className="flex-1"><Button variant="outline" size="sm" className="w-full">Login</Button></Link>
            <Link to="/book" className="flex-1"><Button size="sm" className="w-full bg-accent text-accent-foreground">Book</Button></Link>
          </div>
        </div>
      )}
    </header>
  );
}