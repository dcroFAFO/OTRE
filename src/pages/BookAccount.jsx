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

              <div className="mt-8 mx-auto flex w-full max-w-[440px] flex-col items-center gap-[13px]">
                <Button
                  variant="outline"
                  className="group h-16 w-full overflow-hidden rounded-[10px] border-[#2F7FE4] bg-[#2F7FE4] p-0 text-[25px] font-semibold text-white shadow-[0_2px_7px_rgba(47,127,228,0.25)] hover:bg-[#2B77D7] hover:text-white"
                  onClick={() => oauth("google")}
                >
                  <span className="grid h-full w-16 shrink-0 place-items-center bg-white">
                    <GoogleIcon className="h-8 w-8" />
                  </span>
                  <span className="flex-1 pr-16 text-center">Continue with Google</span>
                </Button>

                <div className="my-4 flex w-full items-center gap-4 text-[24px] font-medium text-[#22313F]">
                  <span className="h-px flex-1 bg-[#6F7F8C]" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-[#6F7F8C]" />
                </div>

                {providers.slice(1).map((provider) => (
                  <Button
                    key={provider.key}
                    variant="outline"
                    className="h-16 w-full justify-center rounded-[9px] border-[#B7C1CA] bg-white text-[25px] font-semibold text-[#07111E] shadow-[0_1px_4px_rgba(15,23,42,0.12)] hover:bg-[#F8FAFC]"
                    onClick={() => oauth(provider.key)}
                  >
                    {provider.key === "microsoft" && (
                      <span className="grid h-8 w-8 grid-cols-2 gap-0.5">
                        <span className="bg-[#F25022]" />
                        <span className="bg-[#7FBA00]" />
                        <span className="bg-[#00A4EF]" />
                        <span className="bg-[#FFB900]" />
                      </span>
                    )}
                    {provider.key === "facebook" && <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1877F2] text-[29px] font-bold leading-none text-white">f</span>}
                    {provider.key === "apple" && (
                      <svg className="h-8 w-8 text-black" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M16.8 12.45c-.03-3.04 2.48-4.5 2.59-4.57-1.41-2.06-3.61-2.35-4.39-2.38-1.87-.19-3.65 1.1-4.6 1.1-.94 0-2.4-1.07-3.95-1.04-2.03.03-3.9 1.18-4.95 3-2.11 3.66-.54 9.08 1.52 12.05 1 1.45 2.2 3.08 3.77 3.02 1.51-.06 2.08-.98 3.91-.98 1.82 0 2.34.98 3.94.95 1.63-.03 2.66-1.48 3.65-2.94 1.15-1.68 1.62-3.31 1.65-3.39-.04-.02-3.16-1.21-3.19-4.82ZM13.78 3.53c.83-1 1.39-2.39 1.24-3.78-1.2.05-2.65.8-3.51 1.8-.77.89-1.45 2.31-1.27 3.67 1.34.1 2.71-.68 3.54-1.69Z" />
                      </svg>
                    )}
                    {provider.label}
                  </Button>
                ))}

                <div className="my-7 flex w-full items-center gap-4 text-[24px] font-medium text-[#22313F]">
                  <span className="h-px flex-1 bg-[#6F7F8C]" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-[#6F7F8C]" />
                </div>

                <Button asChild variant="ghost" className="h-12 w-full justify-center rounded-[10px] bg-transparent text-[27px] font-semibold text-[#07111E] hover:bg-transparent hover:text-[#07111E]">
                  <Link to={loginHref}><Mail className="h-8 w-8 stroke-[#24394E]" /> Email</Link>
                </Button>
                <Button variant="ghost" disabled className="mt-4 h-16 w-full rounded-full bg-[#E5E9EE] text-[25px] font-semibold text-[#687585] opacity-100 disabled:opacity-100">
                  Phone Number <span className="ml-3 rounded-full bg-[#CBD2DB] px-4 py-1.5 text-[17px] font-bold text-[#556273]">Coming soon</span>
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