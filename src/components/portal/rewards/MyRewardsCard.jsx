import { useState } from "react";
import { Check, Copy, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";
import RewardStatusBadge from "@/components/portal/rewards/RewardStatusBadge";
import { useCustomerRewards } from "@/hooks/useCustomerRewards";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

/** @param {{ userId?: string }} props */
export default function MyRewardsCard({ userId }) {
  const { data, isLoading, error, refetch } = useCustomerRewards(userId);
  const [copied, setCopied] = useState(false);
  const code = data?.referral?.code || "";
  const rewards = data?.rewards || [];
  const activeRewards = rewards.filter((reward) => ["available", "applied", "locked"].includes(reward.status));
  const paidRepairs = Number(data?.loyalty?.paid_repairs || 0);
  const nextRewardAt = Number(data?.loyalty?.next_reward_at || 5);
  const milestoneStart = Math.max(0, nextRewardAt - 5);
  const progress = Math.min(100, Math.max(0, ((paidRepairs - milestoneStart) / 5) * 100));

  const copy = async () => {
    if (!code) return;
    const shareUrl = `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;
    await navigator.clipboard.writeText(shareUrl).catch(() => navigator.clipboard.writeText(code));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (isLoading) return <CardSkeleton className="min-h-52" />;
  if (error) return <ErrorState title="Rewards could not be loaded" error={error} onRetry={refetch} />;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="my-rewards-title">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800"><Gift className="h-4.5 w-4.5" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 id="my-rewards-title" className="font-heading text-lg font-extrabold">My Rewards</h2>
          <p className="text-xs text-muted-foreground">Choose one eligible reward before the workshop records an invoice as paid.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Refer a friend</div>
          {code ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">They receive $10 off their first invoice. You receive 10% off a later invoice after their first repair is paid.</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm font-semibold">{code}</code>
                <Button type="button" size="icon" variant="outline" onClick={copy} aria-label="Copy referral link">
                  {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <span className="sr-only" aria-live="polite">{copied ? "Referral link copied" : ""}</span>
            </>
          ) : <p className="mt-2 text-sm text-muted-foreground">Your referral code is being prepared.</p>}
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-semibold">Repair loyalty</p>
          <p className="mt-1 text-xs text-muted-foreground">Every five paid repairs earns 10% off labour, capped at $50.</p>
          <Progress value={progress} className="mt-4 h-2" aria-label={`${paidRepairs - milestoneStart} of 5 repairs toward the next reward`} />
          <p className="mt-2 text-xs text-muted-foreground">{Math.max(0, nextRewardAt - paidRepairs)} more paid {nextRewardAt - paidRepairs === 1 ? "repair" : "repairs"} to your next reward</p>
        </div>
      </div>

      {activeRewards.length === 0 ? (
        <EmptyState
          compact
          className="mt-3 rounded-xl border border-dashed border-border py-7"
          icon={Gift}
          title="No rewards available yet"
          description="Referral and loyalty rewards will appear here when they are issued."
        />
      ) : (
        <div className="mt-4 space-y-2" aria-label="Active rewards">
          {activeRewards.map((reward) => (
            <div key={reward.id} className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{reward.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Expires {formatDate(reward.expires_at)}</p>
              </div>
              <RewardStatusBadge status={reward.status} className="self-start sm:self-auto" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
