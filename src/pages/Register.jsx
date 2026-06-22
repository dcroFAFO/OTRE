import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Phone } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import SEO from "@/components/SEO";
import { isStaff } from "@/config/permissions";

const DEFAULT_REDIRECT_AFTER_AUTH = "/portal";

function authParams() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next") || DEFAULT_REDIRECT_AFTER_AUTH;
  return {
    email: params.get("email") || "",
    phone: params.get("phone") || "",
    next: next.startsWith("/") ? next : DEFAULT_REDIRECT_AFTER_AUTH,
    customerFlow: params.get("customerFlow") === "1",
  };
}

export default function Register() {
  const { email: initialEmail, phone: initialPhone, next, customerFlow } = authParams();
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
        window.location.href = next;
      })
      .catch(() => {});
  }, [next, customerFlow]);

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
      setMaskedPhone(response.data?.masked_phone || phone);
      setShowPhoneOtp(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not send SMS verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await base44.functions.invoke("verifySignupPhoneOtp", { phone, code: phoneOtpCode });
      setVerifiedPhoneE164(response.data?.phone_e164 || "");
      await base44.auth.register({ email, password });
      setShowPhoneOtp(false);
      setShowOtp(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not verify mobile code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendPhone = async () => {
    setError("");
    try {
      const response = await base44.functions.invoke("sendSignupPhoneOtp", { phone, email });
      setMaskedPhone(response.data?.masked_phone || phone);
      toast({
        title: "Code sent",
        description: "Check your mobile for the new code.",
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to resend SMS code");
    }
  };

  const handleVerify = async () => {
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
        await base44.functions.invoke("claimCustomerJobs", {});
      }
      setTimeout(() => {
        window.location.href = next;
      }, 900);
    } catch (err) {
      setError(err.message || "Invalid verification code");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", next);
  };

  if (showPhoneOtp) {
    return (
      <>
      <SEO title="Verify Mobile | OTR Scooters" description="Verify your mobile number to finish creating your OTR Scooters customer portal account." canonical="/register" noindex />
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
          <button onClick={handleResendPhone} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
      </>
    );
  }

  if (showOtp) {
    return (
      <>
      <SEO title="Verify Email | OTR Scooters" description="Verify your email address to finish setting up your OTR Scooters customer portal account." canonical="/register" noindex />
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
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
      </>
    );
  }

  return (
    <>
    <SEO title="Create Account | OTR Scooters" description="Create an OTR Scooters customer account to book repairs, approve quotes, track jobs and manage invoices online." canonical="/register" noindex />
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
      <div className="mb-7 mx-auto flex w-full max-w-[440px] flex-col items-center gap-[13px]">
        <Button
          variant="outline"
          className="group h-16 w-full overflow-hidden rounded-[10px] border-[#2F7FE4] bg-[#2F7FE4] p-0 text-[25px] font-semibold text-white shadow-[0_2px_7px_rgba(47,127,228,0.25)] hover:bg-[#2B77D7] hover:text-white"
          onClick={handleGoogle}
        >
          <span className="grid h-full w-16 shrink-0 place-items-center bg-white">
            <GoogleIcon className="h-8 w-8" />
          </span>
          <span className="flex-1 pr-16 text-center">Continue with Google</span>
        </Button>
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