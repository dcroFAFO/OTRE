import React, { useEffect, useRef, useState } from "react";
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

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseDisplayDate(value) {
  const match = /^(\d{2})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = 2000 + Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
   return date < startOfToday() ? null : date;
}

function maskDate(value) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

/** @param {{ id?: string, value?: string, onChange: (value: string) => void, disabled?: boolean, className?: string, onValidityChange?: (valid: boolean) => void, describedBy?: string }} props */
export default function PreferredDateField({ id, value = "", onChange, disabled = false, className, onValidityChange, describedBy, ...controlProps }) {
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const lastEmittedValue = useRef(null);
  const selected = parseIsoDate(value);

  useEffect(() => {
    if (value === lastEmittedValue.current) {
      lastEmittedValue.current = null;
      return;
    }
    setDisplayValue(selected ? format(selected, "dd-MM-yy") : "");
  }, [value]);

  const emitValue = (nextValue) => {
    lastEmittedValue.current = nextValue;
    onChange(nextValue);
  };

  const updateDisplay = (nextValue) => {
    const masked = maskDate(nextValue);
    setDisplayValue(masked);
    if (!masked) {
      emitValue("");
      onValidityChange?.(true);
      return;
    }
    if (masked.length < 8) {
      emitValue("");
      onValidityChange?.(false);
      return;
    }
    const date = parseDisplayDate(masked);
    onValidityChange?.(!!date);
    emitValue(date ? format(date, "yyyy-MM-dd") : "");
  };

  const selectDate = (date) => {
    if (!date || date < startOfToday()) return;
    const nextValue = format(date, "yyyy-MM-dd");
    setDisplayValue(format(date, "dd-MM-yy"));
    emitValue(nextValue);
    onValidityChange?.(true);
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        aria-describedby={describedBy || controlProps["aria-describedby"]}
        aria-invalid={controlProps["aria-invalid"] || Boolean(displayValue && !selected)}
        value={displayValue}
        onChange={(e) => updateDisplay(e.target.value)}
        placeholder="DD-MM-YY"
        disabled={disabled}
        inputMode="numeric"
        className={className}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="iconTouch" disabled={disabled} aria-label="Choose preferred date">
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar mode="single" selected={selected} onSelect={selectDate} disabled={{ before: startOfToday() }} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );
}
