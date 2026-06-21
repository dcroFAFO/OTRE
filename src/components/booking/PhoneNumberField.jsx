import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizePhoneToE164 } from "@/lib/phone";

export default function PhoneNumberField({ label = "Phone", required, value, onChange, error }) {
  const inputId = "booking-phone";
  const helpId = "booking-phone-help";
  const errorId = "booking-phone-error";
  const normalizedPhone = value ? normalizePhoneToE164(value) : null;

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs font-semibold">
        {label}{required && <span className="text-accent"> *</span>}
      </Label>
      <Input
        id={inputId}
        name="phone"
        type="tel"
        value={value || ""}
        onChange={onChange}
        inputMode="tel"
        autoComplete="tel"
        placeholder="4123 456 789"
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        className="bg-background text-foreground placeholder:text-muted-foreground caret-foreground font-medium"
      />
      <p id={helpId} className="text-[11px] leading-tight text-muted-foreground">Enter an Australian mobile number without the country selector.</p>
      {normalizedPhone?.phone_e164 && (
        <p className="text-[11px] leading-tight font-medium text-foreground">
          Will be saved as {normalizedPhone.phone_e164}
        </p>
      )}
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{typeof error === "string" ? error : "Please enter a valid phone number."}</p>}
    </div>
  );
}