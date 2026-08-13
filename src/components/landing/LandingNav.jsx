import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import LandingLogo from "@/components/landing/LandingLogo";

/** @param {{ heroRef?: React.RefObject<HTMLElement> }} _props */
export default function LandingNav(_props) {
  const location = useLocation();
  const { data: { app, business }, isFetching } = usePlatformConfig();
  const links = app.landing.navLinks
    .filter((link) => typeof link?.href === "string" && typeof link?.label === "string" && link.href !== "/book")
    .map((link) => ({
      ...link,
      label: link.href === "/blog" ? "News and Events" : link.label,
      href: link.href.startsWith("#") && location.pathname !== "/" ? `/${link.href}` : link.href,
    }));

  const isCurrent = (href) => href.startsWith("/") && !href.includes("#") && (location.pathname === href || (href !== "/" && location.pathname.startsWith(`${href}/`)));

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/95 shadow-sm backdrop-blur-xl">
      <a href="#main-content" className="sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60] focus:not-sr-only focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring">
        Skip to main content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link to="/" className="flex min-h-11 items-center" aria-label={`${business.name} home`}>
          <LandingLogo imageClassName="h-12" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
          {links.map((link) => link.href.startsWith("/") ? (
            <Link key={link.href} to={link.href} aria-current={isCurrent(link.href) ? "page" : undefined} className="flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground">
              {link.label}
            </Link>
          ) : (
            <a key={link.href} href={link.href} className="flex min-h-11 items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{link.label}</a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isFetching ? <span className="sr-only" role="status">Refreshing business details</span> : null}
          <Button asChild variant="ghost" size="sm"><Link to="/portal">{app.landing.portalLabel}</Link></Button>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/book">Book a Repair</Link></Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="icon" className="h-11 w-11 md:hidden" aria-label="Open navigation menu">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="flex w-[min(88vw,22rem)] flex-col p-0">
            <SheetHeader className="border-b border-border px-5 pb-4 pt-6 text-left">
              <SheetTitle>{business.name}</SheetTitle>
              <SheetDescription>Repairs, servicing and diagnostics in Woolloongabba.</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col px-3 py-4" aria-label="Mobile navigation">
              {links.map((link) => (
                <SheetClose asChild key={link.href}>
                  {link.href.startsWith("/") ? (
                    <Link to={link.href} aria-current={isCurrent(link.href) ? "page" : undefined} className="flex min-h-12 items-center rounded-lg px-3 text-base font-semibold text-foreground hover:bg-secondary aria-[current=page]:bg-secondary">{link.label}</Link>
                  ) : (
                    <a href={link.href} className="flex min-h-12 items-center rounded-lg px-3 text-base font-semibold text-foreground hover:bg-secondary">{link.label}</a>
                  )}
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto grid gap-3 border-t border-border p-5">
              <SheetClose asChild><Button asChild className="h-12"><Link to="/book">Book a Repair</Link></Button></SheetClose>
              <SheetClose asChild><Button asChild variant="outline" className="h-12"><Link to="/portal">Customer login</Link></Button></SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
