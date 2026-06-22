import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PhoneNumberField({ label = "Phone", required, value, onChange, error }) {
  const inputId = "booking-phone";
  const errorId = "booking-phone-error";

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs font-semibold">
        {label}{required && <span className="text-accent"> *</span>}
      </Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center gap-1.5 border-r border-border px-3 text-sm font-semibold text-foreground/80">
          <span aria-hidden="true">🇦🇺</span>
          <span>+61</span>
        </div>
        <Input
          id={inputId}
          name="phone"
          type="tel"
          value={value || ""}
          onChange={onChange}
          inputMode="tel"
          autoComplete="tel"
          placeholder="415 297 247"
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="h-9 bg-background pl-[5.2rem] text-foreground placeholder:text-muted-foreground caret-foreground font-medium"
        />
      </div>
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{typeof error === "string" ? error : "Enter a valid Australian mobile number"}</p>}
    </div>
  );
}