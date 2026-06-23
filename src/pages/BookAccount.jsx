import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingParallaxBackground from "@/components/landing/LandingParallaxBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GoogleIcon from "@/components/GoogleIcon";
import { ArrowRight, CheckCircle2, LogIn, Mail, Phone, ShieldCheck, Sparkles, UserPlus } from "lucide-react";

const BOOK_NEXT = "/portal?book=1";
const SETUP_NEXT = `/profile-setup?next=${encodeURIComponent(BOOK_NEXT)}`;

const benefits = [
"Track your repair from your customer portal",
"Get automatic status updates",
"View and pay invoices online",
"Join Refer a Rider",
"Join Frequent Rider and get a free performance tune up valued at $150 on every 5th service or repair",
"Access exclusive offers and deals"];


const providers = [
{ key: "google", label: "Continue with Google", supported: true },
{ key: "microsoft", label: "Continue with Microsoft", supported: true },
{ key: "facebook", label: "Continue with Facebook", supported: true },
{ key: "apple", label: "Continue with Apple", supported: true }];


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
        <LandingParallaxBackground />
        <LandingNav />
        <section className="relative z-10 px-5 pb-16 pt-24 sm:px-8 sm:pb-24 sm:pt-28">
          <div className="mx-auto max-w-7xl">
            <Link to="/" className="inline-flex items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">← Back to home</Link>

            <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-3xl border border-border bg-card/85 p-6 shadow-gentle backdrop-blur-xl sm:p-8 lg:p-10">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                  <Sparkles className="h-3.5 w-3.5" /> Repair booking
                </span>
                <h1 className="mt-5 max-w-2xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">Book your repair your way</h1>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  Sign in or create a free account for the best booking experience, or continue as a guest to send through a repair request.
                </p>

                <div className="mt-8 rounded-2xl border border-border bg-background/70 p-5 shadow-soft sm:p-6">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Included</p>
                      <h2 className="mt-1 font-heading text-2xl font-extrabold">Free account benefits</h2>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {benefits.map((benefit) => (
                      <div key={benefit} className="flex gap-3 rounded-2xl border border-border bg-card/80 p-4 text-sm leading-snug text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-card/95 p-6 shadow-gentle backdrop-blur-xl sm:p-8 lg:p-10">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent">
                    <UserPlus className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-heading text-2xl font-extrabold">Create a free account</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Book faster, track your repair, manage invoices, and access rewards from your customer portal.</p>
                  </div>
                </div>

                <div className="mt-7 flex w-full flex-col gap-3">
                  <Button variant="outline" className="group h-12 w-full justify-start rounded-2xl border-border bg-background/70 px-4 text-base font-semibold shadow-soft hover:bg-secondary/70" onClick={() => oauth("google")}>
                    <GoogleIcon className="h-5 w-5" />
                    <span className="flex-1 text-center">Continue with Google</span>
                  </Button>

                  {providers.slice(1).map((provider) => (
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

                  <div className="my-3 flex items-center gap-4 text-sm font-semibold text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    <span>or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                    <h3 className="font-heading text-base font-extrabold">Sign up using email</h3>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input type="email" placeholder="Email address" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="h-11 rounded-xl bg-card pl-10" />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input type="tel" placeholder="Phone number" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="h-11 rounded-xl bg-card pl-10" />
                    </div>
                    <Button asChild className="h-11 w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
                      <Link to={registerHref}>Sign Up Now <ArrowRight className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" className="h-auto justify-start rounded-2xl border-border bg-background/70 p-4 text-left shadow-soft hover:bg-secondary/70">
                    <Link to={loginHref}>
                      <LogIn className="h-5 w-5 text-accent" />
                      <span>
                        <span className="block font-heading font-extrabold">Already have an account?</span>
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">Sign in to book from your portal.</span>
                      </span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-auto justify-start rounded-2xl border-border bg-background/70 p-4 text-left shadow-soft hover:bg-secondary/70">
                    <Link to="/book/guest">
                      <ArrowRight className="h-5 w-5 text-accent" />
                      <span>
                        <span className="block font-heading font-extrabold">Continue as guest</span>
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">Submit a repair request without an account.</span>
                      </span>
                    </Link>
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
    </>);

}