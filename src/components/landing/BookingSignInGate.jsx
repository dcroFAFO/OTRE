import React from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { base44 } from "@/api/base44Client";
import GoogleIcon from "@/components/GoogleIcon";

// Sign-in gate shown above the booking form when the visitor isn't authenticated.
// Customers must connect an account so every booking is tied to their identity.
const PROVIDERS = [
  { key: "google", label: "Continue with Google" },
  { key: "microsoft", label: "Continue with Microsoft" },
  { key: "facebook", label: "Continue with Facebook" },
  { key: "apple", label: "Continue with Apple" },
];

export default function BookingSignInGate() {
  const signIn = (provider) => base44.auth.loginWithProvider(provider, window.location.href);

  return (
    <section id="book" className="py-20 sm:py-28">
      <div className="mx-auto max-w-md px-5 sm:px-8">
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/15 text-accent">
            <LogIn className="h-7 w-7" />
          </span>
          <h2 className="mt-5 font-heading text-2xl font-extrabold text-foreground">Sign in to book</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create or sign in to your account to request a booking and track its progress online.
          </p>

          <div className="mt-6 space-y-3">
            {PROVIDERS.map((p) => (
              <Button
                key={p.key}
                variant="outline"
                className="w-full h-12 text-sm font-medium"
                onClick={() => signIn(p.key)}
              >
                {p.key === "google" && <GoogleIcon className="w-5 h-5 mr-2" />}
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}