import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import PublicBookingForm from "@/components/booking/PublicBookingForm";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import { CheckCircle2, ChevronDown, LogIn, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { createAuthCallbackTarget } from "@/lib/authCallbackState";

const BOOK_NEXT = "/portal?book=1";
const SETUP_NEXT = `/profile-setup?next=${encodeURIComponent(BOOK_NEXT)}`;

function referralCode() {
  return String(new URLSearchParams(window.location.search).get("ref") || "").trim().toUpperCase().slice(0, 32);
}

export default function BookAccount() {
  const [accountOpen, setAccountOpen] = useState(false);
  const referral = referralCode();
  const loginHref = `/login?next=${encodeURIComponent(BOOK_NEXT)}`;
  const registerParams = new URLSearchParams({ next: SETUP_NEXT, customerFlow: "1" });
  if (referral) registerParams.set("ref", referral);
  const registerHref = `/register?${registerParams.toString()}`;

  const oauth = (provider) => {
    const callbackParams = new URLSearchParams({ oauthComplete: "1", next: SETUP_NEXT, customerFlow: "1" });
    if (referral) callbackParams.set("ref", referral);
    base44.auth.loginWithProvider(
      provider,
      createAuthCallbackTarget(`/register?${callbackParams.toString()}`),
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Book an Electric Scooter Repair | On The Run Electrics" description="Send a guest repair request first, or sign in to manage bookings and invoices in your customer account." canonical="/book" noindex />
      <LandingNav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <section className="lg:sticky lg:top-24" aria-labelledby="booking-heading">
            <p className="text-xs font-bold uppercase text-primary">Repair booking</p>
            <h1 id="booking-heading" className="mt-3 font-heading text-3xl font-extrabold sm:text-4xl">Tell us about your scooter</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">Send the repair request as a guest. No payment is required, and we will verify one contact method before submission.</p>
            <ul className="mt-5 space-y-3 text-sm">
              {["We review the request before confirming a time", "Your details stay available while you verify", "Create an account later to track repairs and invoices"].map((item) => (
                <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" /><span>{item}</span></li>
              ))}
            </ul>

            <Collapsible open={accountOpen} onOpenChange={setAccountOpen} className="mt-8 border-t border-border pt-5">
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="h-12 w-full justify-between" aria-label="Show account booking options">
                  <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" /> Prefer to use an account?</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", accountOpen && "rotate-180")} aria-hidden="true" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid gap-2">
                  <Button type="button" variant="outline" className="h-12 justify-start" onClick={() => oauth("google")}>
                    <GoogleIcon className="h-5 w-5" /><span className="flex-1 text-center">Continue with Google</span>
                  </Button>
                  <Button type="button" variant="outline" className="h-12 justify-start" onClick={() => oauth("apple")}>
                    <AppleIcon className="h-5 w-5" /><span className="flex-1 text-center">Continue with Apple</span>
                  </Button>
                  <Button asChild className="h-12"><Link to={registerHref}>Create a customer account</Link></Button>
                  <Button asChild variant="ghost" className="h-11"><Link to={loginHref}><LogIn className="h-4 w-4" /> Sign in to an existing account</Link></Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Account registration verifies your mobile by SMS and your email with separate one-time codes.</p>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <PublicBookingForm guestOnly />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
