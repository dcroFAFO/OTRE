import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import TutorialBubble from "@/components/portal/tutorial/TutorialBubble";
import TutorialMockJobModal from "@/components/portal/tutorial/TutorialMockJobModal";

// onDone(completed) — completed is true when the user reached the end of the
// tour (or accepted it), false when they explicitly closed/skipped it.
export default function PortalTutorial({ onDone }) {
  const [step, setStep] = useState(0);
  const finish = (completed) => {
    base44.auth.updateMe({ hasSeenCustomerPortalTutorial: true }).catch(() => {});
    onDone(completed === true);
  };
  const close = () => finish(false);
  const next = () => setStep((s) => s + 1);

  if (step === 0) {
    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
        <div className="z-[100] w-full max-w-sm rounded-3xl border-2 border-accent bg-card p-6 text-center shadow-[0_0_0_4px_hsl(var(--accent)/0.15),0_16px_48px_rgba(0,0,0,0.35)]">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent"><Sparkles className="h-6 w-6" /></span>
          <h2 className="mt-4 font-heading text-xl font-extrabold">Welcome to your customer portal!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Want a quick tour of how to track your repairs, review invoices and view your ride's history?</p>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="outline" onClick={close}>Close</Button>
            <Button onClick={next} className="bg-accent text-accent-foreground hover:bg-accent/90">Show me around</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[90] bg-foreground/40 p-4 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-1/3 z-[100] flex justify-center px-4">
          <TutorialBubble
            title="Your jobs live here"
            text="Each repair or service shows as a job card on this page. Tap a card any time to see its full details, status, invoices and history."
            onNext={next}
            onClose={close}
          />
        </div>
      </div>
    );
  }

  if (step >= 2 && step <= 4) {
    return <TutorialMockJobModal step={step} onNext={next} onClose={close} />;
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="z-[100] flex w-full justify-center">
        <TutorialBubble
          title="We're here to help"
          text="If you have any questions or concerns, email hello@ontherunelectrics.com.au or call 0415 505 908 and one of our team members will be happy to help. Enjoy the ride — we'll take care of the rest!"
          onNext={() => finish(true)}
          onClose={close}
          nextLabel="Finish"
        />
      </div>
    </div>
  );
}