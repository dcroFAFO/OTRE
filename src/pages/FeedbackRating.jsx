import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, CheckCircle2, Loader2 } from "lucide-react";

export default function FeedbackRating() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialRating = Math.max(1, Math.min(5, Number(params.get("rating")) || 5));
  const jobId = params.get("job") || "";
  const [rating, setRating] = useState(initialRating);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const response = await base44.functions.invoke("submitCustomerFeedback", {
      job_id: jobId,
      rating,
      message,
      page_context: window.location.href,
      device_context: `${window.innerWidth}x${window.innerHeight}`,
      app_context: navigator.userAgent,
    });

    if (response.data?.ok) {
      setSubmitted(true);
    } else {
      setError(response.data?.error || "Something went wrong. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-gentle border-border/70">
        <CardContent className="p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Thanks for your feedback</h1>
              <p className="text-muted-foreground">We appreciate you taking the time to rate your experience.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">OTR Scooters</p>
                <h1 className="text-3xl font-bold text-foreground">How did we do?</h1>
                <p className="text-muted-foreground">Choose a rating and optionally leave a note for the team.</p>
              </div>

              <div className="flex justify-center gap-2" role="radiogroup" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    onClick={() => setRating(star)}
                    className="rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <Star className={`h-10 w-10 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                  </button>
                ))}
              </div>

              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional: tell us what went well or what we could improve"
                className="min-h-32"
              />

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button type="submit" className="w-full" disabled={isSubmitting || !jobId}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit feedback
              </Button>

              {!jobId && <p className="text-xs text-muted-foreground text-center">This feedback link is missing a job reference.</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}