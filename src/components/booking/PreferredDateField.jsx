import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseIsoDate(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function parseDisplayDate(value) {
  const match = /^(\d{2})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function maskDate(value) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export default function PreferredDateField({ value, onChange, disabled, className, onValidityChange }) {
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const selected = parseIsoDate(value);

  useEffect(() => {
    setDisplayValue(selected ? format(selected, "dd-MM-yy") : "");
  }, [value]);

  const updateDisplay = (nextValue) => {
    const masked = maskDate(nextValue);
    setDisplayValue(masked);
    if (!masked) {
      onChange("");
      onValidityChange?.(true);
      return;
    }
    if (masked.length < 8) {
      onChange("");
      onValidityChange?.(false);
      return;
    }
    const date = parseDisplayDate(masked);
    onValidityChange?.(!!date);
    onChange(date ? format(date, "yyyy-MM-dd") : "");
  };

  const selectDate = (date) => {
    if (!date) return;
    onChange(format(date, "yyyy-MM-dd"));
    onValidityChange?.(true);
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={displayValue}
        onChange={(e) => updateDisplay(e.target.value)}
        placeholder="DD-MM-YY"
        disabled={disabled}
        inputMode="numeric"
        className={className}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label="Choose preferred date">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar mode="single" selected={selected} onSelect={selectDate} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );
}