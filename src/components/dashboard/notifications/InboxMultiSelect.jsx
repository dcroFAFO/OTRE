import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// value: comma-separated string of emails. onChange(newCommaSeparatedString)
export default function InboxMultiSelect({ accounts = [], value = "", onChange }) {
  const [open, setOpen] = useState(false);
  const [otherEmail, setOtherEmail] = useState("");

  const selected = value ? value.split(",").map((e) => e.trim()).filter(Boolean) : [];
  const accountEmails = new Set(accounts.map((a) => a.email));

  const setSelected = (emails) => onChange(emails.join(", "));

  const toggle = (email) => {
    if (selected.includes(email)) setSelected(selected.filter((e) => e !== email));
    else setSelected([...selected, email]);
  };

  const addOther = () => {
    const e = otherEmail.trim();
    if (e && !selected.includes(e)) {
      setSelected([...selected, e]);
      setOtherEmail("");
    }
  };

  const customEmails = selected.filter((e) => !accountEmails.has(e));

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal mt-1.5 h-auto min-h-9 py-2">
            <span className="flex flex-wrap gap-1 text-left">
              {selected.length === 0 && <span className="text-muted-foreground">Select recipients…</span>}
              {selected.map((e) => {
                const acc = accounts.find((a) => a.email === e);
                return (
                  <span key={e} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-md px-2 py-0.5 text-xs">
                    {acc?.label || e}
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={(ev) => { ev.stopPropagation(); toggle(e); }} />
                  </span>
                );
              })}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="max-h-64 overflow-y-auto py-1">
            {accounts.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">No staff accounts found.</p>
            )}
            {accounts.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => toggle(a.email)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Checkbox checked={selected.includes(a.email)} className="pointer-events-none" />
                <span className="flex-1 text-left">
                  <span className="font-medium">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">{a.email} · {a.role}</span>
                </span>
                {selected.includes(a.email) && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <div className="border-t border-border p-2">
            <p className="text-xs text-muted-foreground mb-1.5 px-1">Other email</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="someone@email.com"
                value={otherEmail}
                onChange={(e) => setOtherEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
                className="h-8 text-sm"
              />
              <Button type="button" size="sm" variant="secondary" onClick={addOther} className="shrink-0 h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {customEmails.length > 0 && (
        <p className={cn("text-xs text-muted-foreground mt-1.5")}>
          Custom: {customEmails.join(", ")}
        </p>
      )}
    </div>
  );
}