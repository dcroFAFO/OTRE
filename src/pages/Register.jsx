import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Phone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { isStaff } from "@/config/permissions";
import { safeReturnTo } from "@/lib/authReturnTo";
import { getSafeErrorMessage } from "@/lib/errors";

const DEFAULT_REDIRECT_AFTER_AUTH = "/portal";

function authParams() {
  const params = new URLSearchParams(window.location.search);
  // ?returnTo= (e.g. the MCP OAuth consent flow) takes precedence over ?next=.
  const returnTo = safeReturnTo();
  const next = returnTo !== "/" ? returnTo : (params.get("next") || DEFAULT_REDIRECT_AFTER_AUTH);
  return {
    email: params.get("email") || "",
    phone: params.get("phone") || "",
    next: next.startsWith("/") ? next : DEFAULT_REDIRECT_AFTER_AUTH,
    customerFlow: params.get("customerFlow") === "1",
    referralCode: String(params.get("ref") || "").trim().toUpperCase().slice(0, 32),
    oauthComplete: params.get("oauthComplete") === "1",
  };
}

async function finishCustomerAccount(referralCode) {
  const claim = await base44.functions.invoke("claimCustomerJobs", {});
  if (claim.data?.error) throw Object.assign(new Error(claim.data.error), { status: claim.status || 400, response: claim });
  if (!referralCode) return;
  const reward = await base44.functions.invoke("customerRewards", { action: "claimReferral", code: referralCode });
  if (reward.data?.error) throw Object.assign(new Error(reward.data.error), { status: reward.status || 400, response: reward });
}

export default function Register() {
  const { email: initialEmail, phone: initialPhone, next, customerFlow, referralCode, oauthComplete } = authParams();
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [phoneOtpCode, setPhoneOtpCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [verifiedPhoneE164, setVerifiedPhoneE164] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [oauthSetupFailed, setOauthSetupFailed] = useState(false);
  const [resendingPhone, setResendingPhone] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const setupStarted = useRef(false);

  // Already signed in? Customer booking links should not reuse a staff session.
  useEffect(() => {
    base44.auth
      .isAuthenticated()
      .then(async (authed) => {
        if (!authed) return;
        const currentUser = await base44.auth.me();
        if (customerFlow && isStaff(currentUser?.role)) {
          await base44.auth.logout(window.location.href);
          return;
        }
        if (!oauthComplete) {
          window.location.href = next;
          return;
        }
        if (setupStarted.current) return;
        setupStarted.current = true;
        setLoading(true);
        try {
          await base44.auth.updateMe({ is_customer: true });
          await finishCustomerAccount(referralCode);
          window.location.href = next;
        } catch (setupError) {
          setVerified(true);
          setOauthSetupFailed(true);
          setError(getSafeErrorMessage(setupError, "Your account was created, but setup could not be completed. Please retry."));
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [next, customerFlow, oauthComplete, referralCode]);

  const completeSetup = async () => {
    setError("");
    setLoading(true);
    try {
      await finishCustomerAccount(referralCode);
      setAccountReady(true);
      setOauthSetupFailed(false);
      window.setTimeout(() => { window.location.href = next; }, 600);
    } catch (setupError) {
      setError(getSafeErrorMessage(setupError, "Your account was verified, but setup could not be completed. Please retry."));
    } finally {
      setLoading(false);
    }
  };

  const continueWithoutReferral = async () => {
    setError("");
    setLoading(true);
    try {
      await finishCustomerAccount("");
      window.location.href = next;
    } catch (setupError) {
      setError(getSafeErrorMessage(setupError, "Your account setup could not be completed. Please retry."));
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!phone.trim()) {
      setError("Enter your mobile number to receive a security code.");
      return;
    }
    setLoading(true);
    try {
      const response = await base44.functions.invoke("sendSignupPhoneOtp", { phone, email });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { status: response.status || 400, response });
      setMaskedPhone(response.data?.masked_phone || phone);
      setShowPhoneOtp(true);
    } catch (err) {
      setError(getSafeErrorMessage(err, "Could not send the SMS verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await base44.functions.invoke("verifySignupPhoneOtp", { phone, code: phoneOtpCode });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { status: response.status || 400, response });
      setVerifiedPhoneE164(response.data?.phone_e164 || "");
      await base44.auth.register({ email, password });
      setShowPhoneOtp(false);
      setShowOtp(true);
    } catch (err) {
      setError(getSafeErrorMessage(err, "Could not verify the mobile code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendPhone = async () => {
    if (resendingPhone || loading) return;
    setError("");
    setResendingPhone(true);
    try {
      const response = await base44.functions.invoke("sendSignupPhoneOtp", { phone, email });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { status: response.status || 400, response });
      setMaskedPhone(response.data?.masked_phone || phone);
      toast.success("Code sent", { description: "Check your mobile for the new code." });
    } catch (err) {
      setError(getSafeErrorMessage(err, "Could not resend the SMS code. Please try again."));
    } finally {
      setResendingPhone(false);
    }
  };

  const handleVerify = async () => {
    if (verified) {
      await completeSetup();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
        setVerified(true);
        await base44.auth.updateMe({
          phone: verifiedPhoneE164 || phone,
          phone_e164: verifiedPhoneE164,
          phone_verified: true,
          is_customer: true,
        });
        await finishCustomerAccount(referralCode);
        setAccountReady(true);
      }
      setTimeout(() => {
        window.location.href = next;
      }, 900);
    } catch (err) {
      setError(getSafeErrorMessage(err, "The code or account setup could not be verified. Please try again."));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendingEmail || loading) return;
    setError("");
    setResendingEmail(true);
    try {
      await base44.auth.resendOtp(email);
      toast.success("Code sent", { description: "Check your email for the new code." });
    } catch (err) {
      setError(getSafeErrorMessage(err, "Could not resend the email code. Please try again."));
    } finally {
      setResendingEmail(false);
    }
  };

  const handleGoogle = () => {
    const params = new URLSearchParams({ oauthComplete: "1", next });
    if (referralCode) params.set("ref", referralCode);
    if (customerFlow) params.set("customerFlow", "1");
    base44.auth.loginWithProvider("google", `/register?${params.toString()}`);
  };

  const handleApple = () => {
    const params = new URLSearchParams({ oauthComplete: "1", next });
    if (referralCode) params.set("ref", referralCode);
    if (customerFlow) params.set("customerFlow", "1");
    base44.auth.loginWithProvider("apple", `/register?${params.toString()}`);
  };

  if (oauthComplete && (verified || oauthSetupFailed)) {
    return (
      <>
        <SEO title="Finish Account Setup | On The Run Electrics" description="Finish setting up your customer account." canonical="/register" noindex />
        <AuthLayout icon={UserPlus} title="Finish account setup" subtitle={accountReady ? "Your account is ready." : "Link your customer profile and referral reward."}>
          {error ? <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{error}</div> : null}
          <Button className="h-12 w-full" onClick={completeSetup} disabled={loading || accountReady}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finishing setup...</> : accountReady ? "Redirecting..." : "Retry account setup"}
          </Button>
          {referralCode && error ? <Button variant="ghost" className="mt-2 h-11 w-full" onClick={continueWithoutReferral} disabled={loading}>Continue without referral reward</Button> : null}
        </AuthLayout>
      </>
    );
  }

  if (showPhoneOtp) {
    return (
      <>
      <SEO title="Verify Mobile | On The Run Electrics" description="Verify your mobile number to finish creating your On The Run Electrics customer account." canonical="/register" noindex />
      <AuthLayout
        icon={Phone}
        title="Verify your mobile"
        subtitle={`We sent a security code to ${maskedPhone || phone}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={phoneOtpCode}
            onChange={setPhoneOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerifyPhone}
          disabled={loading || phoneOtpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify mobile"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button type="button" onClick={handleResendPhone} disabled={resendingPhone || loading} className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60">
            {resendingPhone ? "Resending..." : "Resend"}
          </button>
        </p>
        <p className="sr-only" aria-live="polite">{resendingPhone ? "Sending a new mobile code" : ""}</p>
      </AuthLayout>
      </>
    );
  }

  if (showOtp) {
    return (
      <>
      <SEO title="Verify Email | On The Run Electrics" description="Verify your email address to finish setting up your On The Run Electrics customer account." canonical="/register" noindex />
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {verified && (
          <div className="mb-4 p-3 rounded-lg bg-accent/10 text-accent text-sm font-medium">
            Email verified — linking your booking now.
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            verified ? "Retry account setup" : "Verify"
          )}
        </Button>
        {verified && referralCode && error ? <Button variant="ghost" className="mt-2 w-full" onClick={continueWithoutReferral} disabled={loading}>Continue without referral reward</Button> : null}
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button type="button" onClick={handleResend} disabled={resendingEmail || loading} className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60">
            {resendingEmail ? "Resending..." : "Resend"}
          </button>
        </p>
        <p className="sr-only" aria-live="polite">{resendingEmail ? "Sending a new email code" : ""}</p>
      </AuthLayout>
      </>
    );
  }

  return (
    <>
    <SEO title="Create Account | On The Run Electrics" description="Create an On The Run Electrics customer account to book repairs, approve quotes, track jobs and manage invoices online." canonical="/register" noindex />
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`} className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="mx-auto mb-6 grid w-full max-w-[440px] gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-12 w-full gap-2 rounded-md"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon className="h-5 w-5" />
          Google
        </Button>

        <Button
          variant="outline"
          className="h-12 w-full gap-2 rounded-md border-black bg-black text-white hover:bg-black/90 hover:text-white"
          onClick={handleApple}
          disabled={loading}
        >
          <AppleIcon className="h-5 w-5 text-white" />
          Apple
        </Button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#6F7F8C]" />
        </div>
        <div className="relative flex justify-center text-sm font-medium">
          <span className="bg-card px-4 text-muted-foreground">or use email</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {referralCode && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Referral code <strong>{referralCode}</strong> will be validated after your email and mobile are verified.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          We will verify your mobile by SMS first, then verify your email before creating the account.
        </p>
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
          <Label htmlFor="phone">Mobile number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="04xx xxx xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">We’ll send a one-time security code to this mobile.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending code...
            </>
          ) : (
            "Send mobile security code"
          )}
        </Button>
      </form>
    </AuthLayout>
    </>
  );
}
