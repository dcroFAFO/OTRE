import { useMemo, useState } from "react";
import { Gift, Loader2, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FieldShell from "@/components/shared/FieldShell";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getSafeErrorMessage } from "@/lib/errors";
import { useCustomerRewards } from "@/hooks/useCustomerRewards";
import { toast } from "sonner";

/** @param {{ invoice: Record<string, any>, userId?: string, onChanged?: (invoice: Record<string, any>) => void }} props */
export default function RewardPicker({ invoice, userId, onChanged }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useCustomerRewards(userId, !!invoice && invoice.status !== "paid");
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState("");
  const available = useMemo(() => (data?.rewards || []).filter((reward) => reward.status === "available"), [data]);
  const canChange = !invoice.checkout_started_at && !["paid", "refunded", "cancelled", "void"].includes(invoice.status);

  const updateReward = async (action, rewardId = "") => {
    setPending(action);
    try {
      const response = await base44.functions.invoke("customerRewards", {
        action,
        invoice_id: invoice.id,
        ...(rewardId ? { reward_id: rewardId } : {}),
      });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { response });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customerRewards", userId] }),
        queryClient.invalidateQueries({ queryKey: ["portalAccountInvoices"] }),
        queryClient.invalidateQueries({ queryKey: ["portalInvoices"] }),
      ]);
      onChanged?.(response.data.invoice);
      setSelected("");
      toast.success(action === "apply" ? "Reward applied" : "Reward removed", {
        description: "Your revised invoice has been emailed to you.",
      });
    } catch (err) {
      toast.error(getSafeErrorMessage(err, action === "apply" ? "This reward could not be applied." : "This reward could not be removed."));
    } finally {
      setPending("");
    }
  };

  if (invoice.status === "paid") return null;
  if (invoice.reward_id) {
    return (
      <Alert className="mt-3 border-emerald-200 bg-emerald-50/70">
        <Gift className="h-4 w-4 text-emerald-800" />
        <AlertTitle>Reward applied</AlertTitle>
        <AlertDescription className="mt-1">
          <p>{invoice.reward_snapshot?.description || "Your selected reward"} saved AUD ${Number(invoice.reward_discount_amount || 0).toFixed(2)}.</p>
          {canChange ? (
            <Button type="button" variant="outline" size="sm" className="mt-3 gap-1.5" disabled={!!pending} onClick={() => updateReward("remove")}>
              {pending === "remove" ? <LoadingSpinner decorative iconClassName="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Remove reward
            </Button>
          ) : <p className="mt-2 text-xs">This reward is locked because checkout has started.</p>}
        </AlertDescription>
      </Alert>
    );
  }

  if (!canChange) return null;
  if (isLoading) return <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><LoadingSpinner decorative iconClassName="h-3.5 w-3.5" /> Checking rewards...</div>;
  if (error) return <Button type="button" variant="ghost" size="sm" className="mt-2 px-0 text-destructive" onClick={() => refetch()}>Rewards unavailable. Retry</Button>;
  if (available.length === 0) return <p className="mt-3 text-xs text-muted-foreground">No eligible reward is available for this invoice.</p>;

  return (
    <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
      <FieldShell id={`reward-${invoice.id}`} label="Apply a reward" hint="One reward can be used per invoice. Eligibility is confirmed before applying.">
        <Select value={selected} onValueChange={setSelected} disabled={!!pending}>
          <SelectTrigger className="min-h-10 bg-background"><SelectValue placeholder="Choose an available reward" /></SelectTrigger>
          <SelectContent>
            {available.map((reward) => <SelectItem key={reward.id} value={reward.id}>{reward.description}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldShell>
      <Button type="button" size="sm" className="mt-3 gap-1.5" disabled={!selected || !!pending} onClick={() => updateReward("apply", selected)}>
        {pending === "apply" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
        Apply reward
      </Button>
    </div>
  );
}
