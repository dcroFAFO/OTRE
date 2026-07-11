import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import { ArrowRight, LogIn, Sparkles } from "lucide-react";

const BOOK_NEXT = "/portal?book=1";
const SETUP_NEXT = `/profile-setup?next=${encodeURIComponent(BOOK_NEXT)}`;

const providers = [
  { key: "microsoft", label: "Continue with Microsoft" },
  { key: "facebook", label: "Continue with Facebook" },
  { key: "apple", label: "Continue with Apple" },
];

export default function BookAccount() {
  const loginHref = `/login?next=${encodeURIComponent(BOOK_NEXT)}`;
  const registerHref = `/register?next=${encodeURIComponent(SETUP_NEXT)}&customerFlow=1`;

  const oauth = (provider) => {
    base44.auth.loginWithProvider(provider, SETUP_NEXT);
  };

  return (
    <>
      <SEO title="Book an Electric Scooter Repair | On The Run Electrics" description="Book an electric scooter repair in Brisbane with On The Run Electrics. Choose account booking or submit a quick guest repair request online." canonical="/book" />
      <main className="min-h-screen bg-background text-foreground">
        <LandingParallaxBackground />
        <LandingNav />
        <section className="relative z-10 px-5 pb-16 pt-24 sm:px-8 sm:pb-24 sm:pt-28">
          <div className="mx-auto max-w-md">
            <Link to="/" className="inline-flex items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">← Back to home</Link>

            <section className="mt-6 rounded-3xl border border-border bg-card/95 p-6 shadow-gentle backdrop-blur-xl sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                <Sparkles className="h-3.5 w-3.5" /> Repair booking
              </span>
              <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Book your repair</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Sign in or create a free account to book, track your repair and manage invoices — or continue as a guest.
              </p>

              <div className="mt-6 flex w-full flex-col gap-3">
                <Button variant="outline" className="h-12 w-full justify-start rounded-2xl border-border bg-background/70 px-4 text-base font-semibold shadow-soft hover:bg-secondary/70" onClick={() => oauth("google")}>
                  <GoogleIcon className="h-5 w-5" />
                  <span className="flex-1 text-center">Continue with Google</span>
                </Button>

                {providers.map((provider) => (
                  <Button key={provider.key} variant="outline" className="h-12 w-full justify-start rounded-2xl border-border bg-background/70 px-4 text-base font-semibold shadow-soft hover:bg-secondary/70" onClick={() => oauth(provider.key)}>
                    {provider.key === "microsoft" && (
                      <span className="grid h-5 w-5 shrink-0 grid-cols-2 gap-0.5">
                        <span className="bg-[#F25022]" />
                        <span className="bg-[#7FBA00]" />
                        <span className="bg-[#00A4EF]" />
                        <span className="bg-[#FFB900]" />
                      </span>
                    )}
                    {provider.key === "facebook" && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#1877F2] text-base font-bold leading-none text-white">f</span>}
                    {provider.key === "apple" && (
                      <svg className="h-5 w-5 shrink-0 text-foreground" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M16.8 12.45c-.03-3.04 2.48-4.5 2.59-4.57-1.41-2.06-3.61-2.35-4.39-2.38-1.87-.19-3.65 1.1-4.6 1.1-.94 0-2.4-1.07-3.95-1.04-2.03.03-3.9 1.18-4.95 3-2.11 3.66-.54 9.08 1.52 12.05 1 1.45 2.2 3.08 3.77 3.02 1.51-.06 2.08-.98 3.91-.98 1.82 0 2.34.98 3.94.95 1.63-.03 2.66-1.48 3.65-2.94 1.15-1.68 1.62-3.31 1.65-3.39-.04-.02-3.16-1.21-3.19-4.82ZM13.78 3.53c.83-1 1.39-2.39 1.24-3.78-1.2.05-2.65.8-3.51 1.8-.77.89-1.45 2.31-1.27 3.67 1.34.1 2.71-.68 3.54-1.69Z" />
                      </svg>
                    )}
                    <span className="flex-1 text-center">{provider.label}</span>
                  </Button>
                ))}

                <div className="my-2 flex items-center gap-4 text-sm font-semibold text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button asChild className="h-12 w-full rounded-2xl bg-accent px-4 text-base font-semibold text-accent-foreground shadow-soft hover:bg-accent/90">
                  <Link to={registerHref}>Sign Up Now <ArrowRight className="h-4 w-4" /></Link>
                </Button>

                <Button asChild variant="outline" className="h-12 w-full justify-start rounded-2xl border-border bg-background/70 px-4 text-base font-semibold shadow-soft hover:bg-secondary/70">
                  <Link to={loginHref}>
                    <LogIn className="h-5 w-5 text-accent" />
                    <span className="flex-1 text-center">Already have an account? Sign in</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-12 w-full justify-start rounded-2xl border-border bg-background/70 px-4 text-base font-semibold shadow-soft hover:bg-secondary/70">
                  <Link to="/book/guest">
                    <ArrowRight className="h-5 w-5 text-accent" />
                    <span className="flex-1 text-center">Continue as guest</span>
                  </Link>
                </Button>
              </div>

              <p className="mt-5 text-center text-xs text-muted-foreground">Free accounts include repair tracking, status updates and online invoice payments.</p>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}