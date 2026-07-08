import React, { useState } from "react";
import { Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Customer-facing referral placeholder. No emails/SMS are sent and no
// discount is applied automatically — staff track eligibility manually
// via the referral fields on the Customer record until a full referral
// engine is built.
export default function MyReferralsCard({ referral }) {
  const [copied, setCopied] = useState(false);
  const code = referral?.referral_code;

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code).catch(() => null);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><Gift className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-heading text-lg font-extrabold">My Referrals</h2>
          <p className="text-xs text-muted-foreground">Refer a friend for 10% off your next spend.</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-4">
        {code ? (
          <>
            <p className="text-xs text-muted-foreground">Your referral code</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex-1 rounded-lg bg-secondary px-3 py-2 font-mono text-sm font-semibold tracking-wide">{code}</span>
              <Button size="icon" variant="outline" onClick={copy} aria-label="Copy referral code">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Your referral code will appear here.</p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Share your code with friends — referral tracking and rewards are coming soon.
        </p>
      </div>
    </section>
  );
}