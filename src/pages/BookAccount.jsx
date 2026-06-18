import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import GoogleIcon from "@/components/GoogleIcon";
import { CheckCircle2, CreditCard, FileCheck2, ShieldCheck, ClipboardList, Mail } from "lucide-react";

const PROVIDERS = [
  { key: "google", label: "Continue with Google" },
  { key: "microsoft", label: "Continue with Microsoft" },
  { key: "facebook", label: "Continue with Facebook" },
  { key: "apple", label: "Continue with Apple" },
  { key: "email", label: "Continue with Email" },
];

const BENEFITS = [
  {
    icon: ClipboardList,
    title: "Track every job online",
    body: "See your booking, repair status, technician updates, and pickup readiness from your customer portal.",
  },
  {
    icon: FileCheck2,
    title: "Approve quotes digitally",
    body: "Review repair recommendations and approve or reject quotes before work proceeds.",
  },
  {
    icon: CreditCard,
    title: "Payment handling in one place",
    body: "Invoices and payment status stay attached to the job, so everything is easy to find.",
  },
  {
    icon: ShieldCheck,
    title: "Your bookings stay secure",
    body: "Your account links bookings to your email so only you and our team can access your job details.",
  },
];

export default function BookAccount() {
  const signIn = (provider) => {
    if (provider === "email") {
      window.location.href = "/login";
    } else {
      base44.auth.loginWithProvider(provider, `${window.location.origin}/portal`);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 otr-grid-bg opacity-[0.16]" />
          <div className="absolute -top-36 -right-32 h-[460px] w-[460px] rounded-full bg-accent/15 blur-[90px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 sm:px-8 grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div>
            <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </Link>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
              <CheckCircle2 className="h-3.5 w-3.5" /> Account required for bookings
            </div>
            <h1 className="mt-5 font-heading text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Create an account to book and manage your scooter repair.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Bookings are now connected to a secure customer account, giving you quote approvals, job tracking, updates, and payment handling in one place.
            </p>

          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xl">
            <h2 className="font-heading text-2xl font-extrabold">Sign in or create your account</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use one of the secure sign-in options below, then you can submit your booking details.
            </p>
            <div className="mt-6 space-y-3">
              {PROVIDERS.map((provider) => (
                <Button
                  key={provider.key}
                  variant="outline"
                  className="w-full h-12 justify-center text-sm font-medium"
                  onClick={() => signIn(provider.key)}
                >
                  {provider.key === "google" && <GoogleIcon className="w-5 h-5 mr-2" />}
                  {provider.key === "email" && <Mail className="w-5 h-5 mr-2" />}
                  {provider.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-heading text-base font-extrabold">{benefit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{benefit.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}