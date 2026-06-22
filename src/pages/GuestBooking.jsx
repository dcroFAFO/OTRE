import React from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import PublicBookingForm from "@/components/booking/PublicBookingForm";

export default function GuestBooking() {
  return (
    <>
      <SEO
        title="Guest Repair Booking | On The Run Electrics"
        description="Submit your electric scooter repair details as a guest."
        canonical="/book/guest"
        noindex
      />
      <main className="min-h-screen bg-background text-foreground">
        <section className="relative overflow-hidden py-4 sm:py-6 lg:py-8">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 otr-grid-bg opacity-[0.12]" />
            <div className="absolute -top-40 -right-36 h-[360px] w-[360px] rounded-full bg-accent/10 blur-[80px]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-[0.62fr_1.38fr] lg:gap-6 lg:px-8 items-start">
            <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm lg:p-5">
              <Link to="/book" className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">← Back to booking options</Link>
              <h1 className="mt-3 font-heading text-3xl font-extrabold tracking-tight leading-tight lg:text-4xl">
                Guest repair booking
              </h1>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p>Tell us what is happening with your electric scooter and provide a few details about the repair you need.</p>
                <p>We will review your request and keep you updated by email or SMS.</p>
              </div>
            </div>

            <PublicBookingForm guestOnly />
          </div>
        </section>
      </main>
    </>
  );
}