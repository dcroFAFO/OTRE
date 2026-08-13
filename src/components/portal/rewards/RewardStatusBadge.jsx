import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  available: "Available",
  applied: "Applied",
  locked: "In checkout",
  redeemed: "Used",
  expired: "Expired",
  released: "Released",
  cancelled: "Cancelled",
};

const STATUS_STYLES = {
  available: "border-emerald-200 bg-emerald-50 text-emerald-800",
  applied: "border-blue-200 bg-blue-50 text-blue-800",
  locked: "border-amber-200 bg-amber-50 text-amber-900",
  redeemed: "border-border bg-muted text-muted-foreground",
  expired: "border-border bg-muted text-muted-foreground",
  released: "border-border bg-muted text-muted-foreground",
  cancelled: "border-red-200 bg-red-50 text-red-800",
};

/** @param {{ status?: string, className?: string }} props */
export default function RewardStatusBadge({ status = "available", className }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status] || STATUS_STYLES.available, className)}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
