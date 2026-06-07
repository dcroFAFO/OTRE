import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStaff } from "@/hooks/useJobs";

// Reuses existing staff data for ownership assignment.
export default function CRMOwnerSelector({ value, onChange, placeholder = "Unassigned", allowUnassigned = true }) {
  const { data: staff = [] } = useStaff();
  return (
    <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allowUnassigned && <SelectItem value="none">{placeholder}</SelectItem>}
        {staff.map((s) => (
          <SelectItem key={s.user_id || s.id} value={s.user_id || s.id}>{s.full_name || s.short_name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}