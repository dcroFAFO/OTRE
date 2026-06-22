import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import { ArrowRight, CheckCircle2, Mail, Phone, ShieldCheck, Sparkles } from "lucide-react";

const BOOK_NEXT = "/portal?book=1";
const SETUP_NEXT = `/profile-setup?next=${encodeURIComponent(BOOK_NEXT)}`;

const benefits = [
  "Easily book and track your repair using our customer portal",
  "Get automatic updates on the status of your repair",
  "View and pay invoices online",
  "Join Refer a Rider",
  "Join Frequent Rider and get a free performance tune up valued at $150 on every 5th service or repair",
  "Get access to exclusive offers and deals",
];

const providers = [
  { key: "google", label: "Continue with Google", supported: true },
  { key: "microsoft", label: "Continue with Microsoft", supported: true },
  { key: "facebook", label: "Continue with Facebook", supported: true },
  { key: "apple", label: "Continue with Apple", supported: true },
];

export default function BookAccount() {
  const loginHref = `/login?next=${encodeURIComponent(BOOK_NEXT)}`;
  const registerHref = `/register?next=${encodeURIComponent(SETUP_NEXT)}&customerFlow=1`;

  const oauth = (provider) => {
    base44.auth.loginWithProvider(provider, SETUP_NEXT);
  };

  return (
    <>
      <SEO title="Book Your Repair | On The Run Electrics" description="Choose how you would like to book your electric scooter repair." canonical="/book" noindex />
      <main className="min-h-screen bg-background text-foreground">
        <section className="relative overflow-hidden px-5 py-10 sm:px-8 sm:py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 otr-grid-bg opacity-[0.12]" />
            <div className="absolute -top-40 -right-36 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[90px]" />
          </div>

          <div className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-xl sm:p-8">
              <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to home</Link>
              <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                <Sparkles className="h-3.5 w-3.5" /> Repair booking
              </span>
              <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">Book your repair</h1>
              <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                Sign in, create a free customer account, or continue as a guest to submit your electric scooter repair request.
              </p>

              <div className="mt-6 rounded-2xl border border-border bg-secondary/40 p-5">
                <div className="flex items-center gap-2 font-heading text-lg font-extrabold">
                  <ShieldCheck className="h-5 w-5 text-accent" /> Free account benefits
                </div>
                <div className="mt-4 grid gap-3">
                  {benefits.map((benefit) => (
                    <p key={benefit} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {benefit}
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
              <h2 className="font-heading text-2xl font-extrabold">Choose how to continue</h2>
              <p className="mt-2 text-sm text-muted-foreground">Account customers can manage bookings, quotes, invoices and updates from the portal.</p>

              <div className="mt-6 grid gap-3">
                {providers.map((provider) => (
                  <Button key={provider.key} variant="outline" className="h-11 justify-start rounded-xl" onClick={() => oauth(provider.key)}>
                    {provider.key === "google" ? <GoogleIcon className="h-5 w-5" /> : <span className="grid h-5 w-5 place-items-center rounded-full bg-secondary text-[10px] font-bold uppercase">{provider.key[0]}</span>}
                    {provider.label}
                  </Button>
                ))}
                <Button asChild variant="outline" className="h-11 justify-start rounded-xl">
                  <Link to={loginHref}><Mail className="h-5 w-5" /> Continue with Email</Link>
                </Button>
                <Button variant="outline" disabled className="h-11 justify-start rounded-xl opacity-60">
                  <Phone className="h-5 w-5" /> Continue with Phone Number <span className="ml-auto text-xs">Coming soon</span>
                </Button>
              </div>

              <div className="my-6 h-px bg-border" />

              <Button asChild className="h-11 w-full rounded-xl">
                <Link to={registerHref}>Not a member yet? Create a free account now <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="ghost" className="mt-3 h-11 w-full rounded-xl">
                <Link to="/book/guest">Continue as guest</Link>
              </Button>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}