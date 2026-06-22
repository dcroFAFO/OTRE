import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GoogleIcon from "@/components/GoogleIcon";
import { ArrowRight, CheckCircle2, Mail, Phone, ShieldCheck, Sparkles } from "lucide-react";

const BOOK_NEXT = "/portal?book=1";
const SETUP_NEXT = `/profile-setup?next=${encodeURIComponent(BOOK_NEXT)}`;

const benefits = [
  "Track your repair from your customer portal",
  "Get automatic status updates",
  "View and pay invoices online",
  "Join Refer a Rider",
  "Join Frequent Rider and get a free performance tune up valued at $150 on every 5th service or repair",
  "Access exclusive offers and deals",
];

const providers = [
  { key: "google", label: "Continue with Google", supported: true },
  { key: "microsoft", label: "Continue with Microsoft", supported: true },
  { key: "facebook", label: "Continue with Facebook", supported: true },
  { key: "apple", label: "Continue with Apple", supported: true },
];

export default function BookAccount() {
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const emailParam = signupEmail.trim() ? `&email=${encodeURIComponent(signupEmail.trim())}` : "";
  const phoneParam = signupPhone.trim() ? `&phone=${encodeURIComponent(signupPhone.trim())}` : "";
  const loginHref = `/login?next=${encodeURIComponent(BOOK_NEXT)}${emailParam}`;
  const registerHref = `/register?next=${encodeURIComponent(SETUP_NEXT)}&customerFlow=1${emailParam}${phoneParam}`;

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
              <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">Book your repair your way</h1>
              <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                Sign in or create a free account for the best booking experience, or continue as a guest to send through a repair request.
              </p>

              <div className="mt-6 rounded-2xl border border-accent/15 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Included</p>
                    <h2 className="mt-1 font-heading text-lg font-extrabold">Free account benefits</h2>
                  </div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex gap-2 rounded-xl border border-border/70 bg-secondary/25 p-3 text-sm leading-snug text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
              <h2 className="font-heading text-2xl font-extrabold">Create a free account</h2>
              <p className="mt-2 text-sm text-muted-foreground">Book faster, track your repair, manage invoices, and access rewards from your customer portal.</p>

              <div className="mt-6 mx-auto flex w-full max-w-[380px] flex-col items-center gap-3">
                <Button
                  variant="outline"
                  className="group h-12 w-full overflow-hidden rounded-[9px] border-[#2F7FE4] bg-[#2F7FE4] p-0 text-lg font-semibold text-white shadow-[0_2px_7px_rgba(47,127,228,0.2)] hover:bg-[#2B77D7] hover:text-white"
                  onClick={() => oauth("google")}
                >
                  <span className="grid h-full w-14 shrink-0 place-items-center bg-white">
                    <GoogleIcon className="h-5 w-5" />
                  </span>
                  <span className="flex-1 pr-14 text-center">Continue with Google</span>
                </Button>

                {providers.slice(1).map((provider) => (
                  <Button
                    key={provider.key}
                    variant="outline"
                    className="h-12 w-full justify-center rounded-[9px] border-[#B7C1CA] bg-white text-lg font-semibold text-[#07111E] shadow-[0_1px_4px_rgba(15,23,42,0.12)] hover:bg-[#F8FAFC]"
                    onClick={() => oauth(provider.key)}
                  >
                    {provider.key === "microsoft" && (
                      <span className="grid h-5 w-5 grid-cols-2 gap-0.5">
                        <span className="bg-[#F25022]" />
                        <span className="bg-[#7FBA00]" />
                        <span className="bg-[#00A4EF]" />
                        <span className="bg-[#FFB900]" />
                      </span>
                    )}
                    {provider.key === "facebook" && <span className="grid h-6 w-6 place-items-center rounded-full bg-[#1877F2] text-[22px] font-bold leading-none text-white">f</span>}
                    {provider.key === "apple" && (
                      <svg className="h-5 w-5 text-black" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M16.8 12.45c-.03-3.04 2.48-4.5 2.59-4.57-1.41-2.06-3.61-2.35-4.39-2.38-1.87-.19-3.65 1.1-4.6 1.1-.94 0-2.4-1.07-3.95-1.04-2.03.03-3.9 1.18-4.95 3-2.11 3.66-.54 9.08 1.52 12.05 1 1.45 2.2 3.08 3.77 3.02 1.51-.06 2.08-.98 3.91-.98 1.82 0 2.34.98 3.94.95 1.63-.03 2.66-1.48 3.65-2.94 1.15-1.68 1.62-3.31 1.65-3.39-.04-.02-3.16-1.21-3.19-4.82ZM13.78 3.53c.83-1 1.39-2.39 1.24-3.78-1.2.05-2.65.8-3.51 1.8-.77.89-1.45 2.31-1.27 3.67 1.34.1 2.71-.68 3.54-1.69Z" />
                      </svg>
                    )}
                    {provider.label}
                  </Button>
                ))}

                <div className="my-4 flex w-full items-center gap-4 text-lg font-medium text-[#22313F]">
                  <span className="h-px flex-1 bg-[#6F7F8C]" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-[#6F7F8C]" />
                </div>

                <div className="w-full space-y-3">
                  <h3 className="text-center text-base font-bold text-[#07111E]">Sign Up Using</h3>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="my-6 h-px bg-border" />

              <Button asChild className="h-11 w-full rounded-xl">
                <Link to={registerHref}>Not a member yet? Create a free account now <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <div className="mt-5 rounded-2xl border border-border bg-secondary/25 p-4">
                <h3 className="font-heading text-lg font-extrabold">Continue as guest</h3>
                <p className="mt-1 text-sm text-muted-foreground">No account needed. Submit your repair request and we’ll keep you updated by email or SMS.</p>
                <Button asChild variant="ghost" className="mt-3 h-11 w-full rounded-xl">
                  <Link to="/book/guest">Continue as guest</Link>
                </Button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}