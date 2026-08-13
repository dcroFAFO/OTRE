import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldShell } from "@/components/shared";

/** @param {any} item */
function initialForm(item) {
  return {
    name: item?.name || "",
    description: item?.description || "",
    category_key: item?.category_key || "uncategorised",
    price: String(item?.price ?? ""),
    order: String(item?.order ?? 0),
    active: item?.active !== false,
  };
}

/**
 * @param {{ item?: Record<string, any> | null, categories: Array<Record<string, any>>, saving?: boolean, onSave: (payload: Record<string, any>) => Promise<void> | void, onCancel: () => void }} props
 */
export default function ServiceItemEditor({ item, categories, saving = false, onSave, onCancel }) {
  const baseId = useId().replace(/:/g, "");
  const [form, setForm] = useState(() => initialForm(item));
  const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
  const [submitting, setSubmitting] = useState(false);
  const busy = saving || submitting;

  useEffect(() => setForm(initialForm(item)), [item]);

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    const nextErrors = /** @type {Record<string, string>} */ ({});
    const price = Number(form.price || 0);
    const order = Number(form.order || 0);
    if (!form.name.trim()) nextErrors.name = "Enter a service name.";
    if (!Number.isFinite(price) || price < 0) nextErrors.price = "Enter a price of zero or more.";
    if (!Number.isFinite(order) || order < 0) nextErrors.order = "Enter a display order of zero or more.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.getElementById(`${baseId}-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
        category_key: form.category_key === "uncategorised" ? "" : form.category_key,
        category: categories.find((category) => category.key === form.category_key)?.name || "",
        price,
        order,
        active: form.active,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="border-y border-border bg-secondary/20 px-4 py-5 sm:px-5" aria-label={item ? `Edit ${item.name}` : "Add service"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell id={`${baseId}-name`} label="Service name" error={errors.name} required>
          <Input value={form.name} onChange={(event) => set("name", event.target.value)} autoFocus />
        </FieldShell>
        <div className="space-y-2">
          <Label htmlFor={`${baseId}-category_key`}>Category</Label>
          <Select value={form.category_key} onValueChange={(value) => set("category_key", value)}>
            <SelectTrigger id={`${baseId}-category_key`}><SelectValue placeholder="Choose a category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="uncategorised">Uncategorised</SelectItem>
              {categories.map((category) => <SelectItem key={category.key} value={category.key}>{category.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <FieldShell id={`${baseId}-price`} label="Standard price" hint="Use 0 for quote on assessment." error={errors.price}>
          <Input type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={(event) => set("price", event.target.value)} />
        </FieldShell>
        <FieldShell id={`${baseId}-order`} label="Display order" error={errors.order}>
          <Input type="number" min="0" step="1" inputMode="numeric" value={form.order} onChange={(event) => set("order", event.target.value)} />
        </FieldShell>
        <FieldShell id={`${baseId}-description`} label="Customer-facing description" className="sm:col-span-2">
          <Textarea rows={3} value={form.description} onChange={(event) => set("description", event.target.value)} />
        </FieldShell>
      </div>

      <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Switch id={`${baseId}-active`} checked={form.active} onCheckedChange={(checked) => set("active", checked)} />
          <label htmlFor={`${baseId}-active`} className="text-sm font-medium">Visible on public pricing</label>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button type="button" variant="outline" size="touch" onClick={onCancel} disabled={busy} className="flex-1 sm:flex-none">Cancel</Button>
          <Button type="submit" size="touch" disabled={busy} className="flex-1 sm:flex-none">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {busy ? "Saving service..." : item ? "Save service" : "Add service"}
          </Button>
        </div>
      </div>
    </form>
  );
}
