import React, { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEED_STEPS, checkSeeded, runSeed } from "@/services/seedService";

// Shown only when first-time setup actually needs to run. Progress shown is
// real — each line corresponds to an actual backend setup step.
export default function SeedLoadingScreen({ onDone }) {
  const [phase, setPhase] = useState("checking"); // checking | seeding | error
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [error, setError] = useState(null);
  const started = useRef(false);

  const start = async () => {
    setError(null);
    setCurrentIndex(-1);
    setPhase("checking");
    try {
      const seeded = await checkSeeded();
      if (seeded) {
        onDone();
        return;
      }
      setPhase("seeding");
      await runSeed((p) => setCurrentIndex(p.index));
      onDone();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Unknown error");
      setPhase("error");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dark fixed inset-0 grid place-items-center bg-background text-foreground px-5">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Zap className="h-6 w-6 text-accent" />
        </span>

        {phase === "error" ? (
          <>
            <AlertCircle className="mx-auto mt-5 h-8 w-8 text-destructive" />
            <h1 className="mt-3 font-heading text-xl font-extrabold">Setup hit a problem</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Something went wrong while
              {currentIndex >= 0 ? ` "${SEED_STEPS[currentIndex].label.toLowerCase()}"` : " checking your setup"}.
              You can safely try again.
            </p>
            <pre className="mt-4 rounded-xl bg-secondary p-3 text-left text-xs text-muted-foreground whitespace-pre-wrap break-words">
              {error}
            </pre>
            <Button onClick={start} className="mt-5 w-full">Try again</Button>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mt-5 h-8 w-8 animate-spin text-accent" />
            <h1 className="mt-3 font-heading text-xl font-extrabold">Getting things ready for you</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {phase === "checking"
                ? "Checking your workshop setup..."
                : "First-time setup — this only happens once and usually takes under a minute."}
            </p>

            {phase === "seeding" && (
              <ul className="mt-6 space-y-2 text-left">
                {SEED_STEPS.map((step, i) => (
                  <li key={step.key} className="flex items-center gap-2.5 text-sm">
                    {i < currentIndex ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    ) : i === currentIndex ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
                    ) : (
                      <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
                    )}
                    <span className={i <= currentIndex ? "text-foreground" : "text-muted-foreground/60"}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}