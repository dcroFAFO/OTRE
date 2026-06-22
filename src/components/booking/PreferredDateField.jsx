import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function parseDate(value) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toDateValue(date) {
  return format(date, "yyyy-MM-dd");
}

export default function PreferredDateField({ value, onChange, disabled, className }) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);

  const selectDate = (date) => {
    if (!date) return;
    onChange(toDateValue(date));
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="YYYY-MM-DD"
          disabled={disabled}
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
      {value && <p className="text-[11px] font-medium text-foreground">Selected date: {value}</p>}
    </div>
  );
}