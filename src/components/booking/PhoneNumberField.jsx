import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PhoneNumberField({ label = "Phone", required, value, onChange, error }) {
  const inputId = "booking-phone";
  const helpId = "booking-phone-help";
  const errorId = "booking-phone-error";

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs font-semibold">
        {label}{required && <span className="text-accent"> *</span>}
      </Label>
      <Input
        id={inputId}
        name="phone"
        type="tel"
        value={value}
        onChange={onChange}
        inputMode="tel"
        autoComplete="tel"
        placeholder="0415 505 908"
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
      />
      <p id={helpId} className="text-[11px] leading-tight text-muted-foreground">Australian mobile numbers are saved as +614xxxxxxxx for repair updates.</p>
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{typeof error === "string" ? error : "Please enter a valid phone number."}</p>}
    </div>
  );
}