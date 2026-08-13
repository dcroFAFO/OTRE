import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCOOTER_BRANDS, BRAND_NAMES } from "@/config/scooterBrands";

// Searchable brand + model picker. Composes the final label string via onChange.
/**
 * @param {{ make?: string, model?: string, customMake?: string, customModel?: string, onChange: (value: { make: string, model: string, customMake: string, customModel: string, label: string }) => void, id?: string, describedBy?: string, invalid?: boolean }} props
 */
export default function AssetBrandPicker({ make, model, customMake, customModel, onChange, id = "asset-picker", describedBy, invalid = false }) {
  const set = (patch) => {
    const next = { make, model, customMake, customModel, ...patch };
    const brand = next.make === "Other" ? next.customMake : next.make;
    const mdl = next.model === "Other model" ? next.customModel : next.model;
    const label = [brand, mdl].filter(Boolean).join(" ").trim();
    onChange({ ...next, label });
  };

  const models = make && make !== "Other" ? SCOOTER_BRANDS[make] || [] : [];

  return (
    <div className="space-y-3">
      <SearchSelect
        id={`${id}-make`}
        ariaLabel="Scooter brand"
        describedBy={describedBy}
        invalid={invalid}
        value={make}
        options={BRAND_NAMES}
        placeholder="Select scooter brand"
        searchPlaceholder="Search brands..."
        onSelect={(v) => set({ make: v, model: "", customMake: "", customModel: "" })}
      />

      {make === "Other" && (
        <Input id={`${id}-custom-make`} aria-label="Custom scooter brand" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={customMake || ""} onChange={(e) => set({ customMake: e.target.value })} placeholder="Enter scooter brand" />
      )}

      {make && make !== "Other" && (
        <SearchSelect
          id={`${id}-model`}
          ariaLabel="Scooter model"
          describedBy={describedBy}
          invalid={invalid}
          value={model}
          options={models}
          placeholder="Select model"
          searchPlaceholder="Search models..."
          onSelect={(v) => set({ model: v, customModel: "" })}
        />
      )}

      {(model === "Other model" || (make === "Other" && customMake)) && (
        <Input id={`${id}-custom-model`} aria-label="Custom scooter model" aria-describedby={describedBy} aria-invalid={invalid || undefined} value={customModel || ""} onChange={(e) => set({ customModel: e.target.value })} placeholder="Enter model" />
      )}
    </div>
  );
}

/**
 * @param {{ id: string, ariaLabel: string, describedBy?: string, invalid?: boolean, value?: string, options: string[], placeholder: string, searchPlaceholder: string, onSelect: (value: string) => void }} props
 */
function SearchSelect({ id, ariaLabel, describedBy, invalid, value, options, placeholder, searchPlaceholder, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value || placeholder}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={() => { onSelect(opt); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === opt ? "opacity-100" : "opacity-0")} />
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
