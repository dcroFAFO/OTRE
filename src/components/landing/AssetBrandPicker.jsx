import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCOOTER_BRANDS, BRAND_NAMES } from "@/config/scooterBrands";

// Lets the user pick a scooter brand, then a model for that brand.
// Composes the final label into a single string via onChange.
export default function AssetBrandPicker({ make, model, customMake, customModel, onChange }) {
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
      <Select value={make || ""} onValueChange={(v) => set({ make: v, model: "", customMake: "", customModel: "" })}>
        <SelectTrigger><SelectValue placeholder="Select scooter brand" /></SelectTrigger>
        <SelectContent>
          {BRAND_NAMES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
        </SelectContent>
      </Select>

      {make === "Other" && (
        <Input
          value={customMake || ""}
          onChange={(e) => set({ customMake: e.target.value })}
          placeholder="Enter scooter brand"
        />
      )}

      {make && make !== "Other" && (
        <Select value={model || ""} onValueChange={(v) => set({ model: v, customModel: "" })}>
          <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
          <SelectContent>
            {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {(model === "Other model" || (make === "Other" && customMake)) && (
        <Input
          value={customModel || ""}
          onChange={(e) => set({ customModel: e.target.value })}
          placeholder="Enter model"
        />
      )}
    </div>
  );
}