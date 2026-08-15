import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, CheckCircle2, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import { Label } from "@/components/ui/label";
import { getSafeErrorMessage } from "@/lib/errors";

function responseError(response) {
  const detail = response?.data?.error;
  const message = typeof detail === "string" ? detail : detail?.message;
  return Object.assign(new Error(message || "Feedback was not accepted."), {
    code: typeof detail === "object" ? detail?.code : "",
    status: response?.status || 400,
    response: { ...response, data: { ...response?.data, error: message || "Feedback was not accepted." } },
  });
}

function feedbackErrorMessage(error) {
  const code = String(error?.code || error?.response?.data?.error?.code || "").toLowerCase();
  const publicMessage = String(error?.response?.data?.error?.message || error?.response?.data?.error || "");
  if (/expired|revoked|already[_ -]?used|invalid[_ -]?(token|invitation|link)/.test(`${code} ${publicMessage}`.toLowerCase())) {
    return "This feedback link has expired, has already been used, or is no longer valid.";
  }
  return getSafeErrorMessage(error, "We couldn't submit your feedback. Your note is still here, so please try again.");
}

export default function FeedbackRating() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialRating = Math.max(1, Math.min(5, Number(params.get("rating")) || 5));
  const jobId = params.get("job") || "";
  const token = String(params.get("token") || "").trim().slice(0, 160);
  const [rating, setRating] = useState(initialRating);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [ownerFallbackAuthenticated, setOwnerFallbackAuthenticated] = useState(token ? true : null);
  useEffect(() => {
    if (token) return;
    if (!jobId) {
      setOwnerFallbackAuthenticated(false);
      return;
    }
    base44.auth.isAuthenticated().then(setOwnerFallbackAuthenticated).catch(() => setOwnerFallbackAuthenticated(false));
  }, [jobId, token]);
  const checkingOwnerFallback = !token && Boolean(jobId) && ownerFallbackAuthenticated === null;
  const missingAuthorizer = !token && (!jobId || ownerFallbackAuthenticated === false);
  const invitationUnavailable = error.startsWith("This feedback link has expired");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await base44.functions.invoke("submitCustomerFeedback", {
        ...(token ? { token } : ownerFallbackAuthenticated ? { job_id: jobId } : {}),
        rating,
        message,
        page_context: window.location.pathname,
        device_context: `${window.innerWidth}x${window.innerHeight}`,
        app_context: navigator.userAgent,
      });

      if (!response.data?.ok) throw responseError(response);
      setSubmitted(true);
    } catch (caught) {
      setError(feedbackErrorMessage(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <SEO title="Customer Feedback | On The Run Electrics" description="Share private feedback about your completed On The Run Electrics repair experience." canonical="/feedback" noindex />
    <main className="min-h-screen bg-background px-4 py-10 flex items-center justify-center">
      <Card className="w-full max-w-lg shadow-gentle border-border/70">
        <CardContent className="p-8">
          {checkingOwnerFallback ? (
            <div className="space-y-3 text-center" role="status">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Checking your account…</p>
            </div>
          ) : missingAuthorizer || invitationUnavailable ? (
            <div className="space-y-4 text-center">
              <h1 className="text-2xl font-bold text-foreground">Feedback link unavailable</h1>
              <p className="text-muted-foreground">{invitationUnavailable ? error : "This link is missing its one-time invitation. Open the latest feedback link from the workshop, or sign in and return from your completed job."}</p>
              <Button asChild variant="outline" className="min-h-11"><Link to="/portal">Go to My Account</Link></Button>
            </div>
          ) : submitted ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Thanks for your feedback</h1>
              <p className="text-muted-foreground">We appreciate you taking the time to rate your experience.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold uppercase text-primary">On The Run Electrics</p>
                <h1 className="text-3xl font-bold text-foreground">How did we do?</h1>
                <p className="text-muted-foreground">Choose a rating and optionally leave a note for the team.</p>
              </div>

              <fieldset>
                <legend className="sr-only">Star rating</legend>
                <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <label key={star} className="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-full focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <input
                      className="sr-only"
                      type="radio"
                      name="rating"
                      value={star}
                      checked={rating === star}
                      onChange={() => setRating(star)}
                      aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    />
                    <Star className={`h-10 w-10 ${star <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/50"}`} aria-hidden="true" />
                  </label>
                ))}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="feedback-message">Feedback note <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell us what went well or what we could improve"
                  className="min-h-32"
                />
              </div>

              {error && <p className="text-sm text-destructive text-center" role="alert">{error}</p>}

              <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                Submit feedback
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
    </>
  );
}
