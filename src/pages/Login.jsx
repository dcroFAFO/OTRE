import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import SEO from "@/components/SEO";

const DEFAULT_REDIRECT_AFTER_AUTH = "/portal";

function authParams() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || DEFAULT_REDIRECT_AFTER_AUTH;
  return {
    email: params.get("email") || "",
    next: next.startsWith("/") ? next : DEFAULT_REDIRECT_AFTER_AUTH,
  };
}

export default function Login() {
  const { email: initialEmail, next } = authParams();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    base44.auth
      .isAuthenticated()
      .then((authed) => {
        if (authed) window.location.href = next;
      })
      .catch(() => {});
  }, [next]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      await base44.functions.invoke("claimCustomerJobs", {}).catch(() => null);
      window.location.href = next;
    } catch (err) {
      setError(err.message || "Invalid email or password");
      setLoading(false);
    }
  };

  const PROVIDERS = [
    { key: "google", label: "Continue with Google" },
    { key: "microsoft", label: "Continue with Microsoft" },
    { key: "facebook", label: "Continue with Facebook" },
    { key: "apple", label: "Continue with Apple" },
  ];

  return (
    <>
    <SEO title="Log In | OTR Scooters" description="Log in to your OTR Scooters customer portal to track repairs, approve quotes and manage invoices." canonical="/login" noindex />
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to={`/register?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`} className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="mb-7 mx-auto flex w-full max-w-[440px] flex-col items-center gap-[13px]">
        <Button
          variant="outline"
          className="group h-16 w-full overflow-hidden rounded-[10px] border-[#2F7FE4] bg-[#2F7FE4] p-0 text-[25px] font-semibold text-white shadow-[0_2px_7px_rgba(47,127,228,0.25)] hover:bg-[#2B77D7] hover:text-white"
          onClick={() => base44.auth.loginWithProvider("google", next)}
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

        {PROVIDERS.slice(1).map((provider) => (
          <Button
            key={provider.key}
            variant="outline"
            className="h-16 w-full justify-center rounded-[9px] border-[#B7C1CA] bg-white text-[25px] font-semibold text-[#07111E] shadow-[0_1px_4px_rgba(15,23,42,0.12)] hover:bg-[#F8FAFC]"
            onClick={() => base44.auth.loginWithProvider(provider.key, next)}
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
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#6F7F8C]" />
        </div>
        <div className="relative flex justify-center text-[24px] font-medium">
          <span className="bg-card px-4 text-[#22313F]">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
    </>
  );
}