import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PHONE_COUNTRY_CODES } from "@/lib/phone";

export default function PhoneNumberField({ label = "Phone", required, countryCode, onCountryCodeChange, value, onChange, error }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-accent"> *</span>}
      </Label>
      <div className="flex gap-2">
        <Select value={countryCode || "+61"} onValueChange={onCountryCodeChange}>
          <SelectTrigger className="w-[112px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRY_CODES.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label} {option.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={value}
          onChange={onChange}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="0415 505 908"
          required={required}
          aria-invalid={!!error}
          className="min-w-0"
        />
      </div>
      <p className="text-xs text-muted-foreground">Used for repair updates and job notifications.</p>
      {error && <p className="text-sm text-destructive">Please enter a valid phone number.</p>}
    </div>
  );
}