import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, ArrowLeft, BellRing, Loader2, Mail, MessageSquareText } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isStaff } from "@/config/permissions";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import SEO from "@/components/SEO";
import AccountDetailsCard from "@/components/portal/settings/AccountDetailsCard";
import ScootersCard from "@/components/portal/settings/ScootersCard";
import SocialProfilesCard from "@/components/portal/settings/SocialProfilesCard";
import { CardSkeleton, ErrorState, PageLoader, UnauthorizedState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const FEEDBACK_CONSENT_VERSION = "2026-08-13";

function unwrapPreferenceResponse(response) {
  if (response?.data?.ok === false) {
    const detail = response.data.error;
    const message = typeof detail === "string" ? detail : detail?.message;
    throw Object.assign(new Error(message || "The preference could not be saved."), {
      status: response.status || 400,
      response: { ...response, data: { ...response.data, error: message || "The preference could not be saved." } },
    });
  }
  return response?.data?.data ?? response?.data ?? {};
}

function normalizeFeedbackPreferences(payload) {
  const source = payload?.preferences ?? payload ?? {};
  if (Array.isArray(source)) {
    return {
      email: source.find((item) => item.channel === "email")?.enabled === true,
      sms: source.find((item) => item.channel === "sms")?.enabled === true,
    };
  }
  const enabled = (channel) => source?.[channel]?.enabled === true || source?.[channel] === true || source?.[`${channel}_enabled`] === true;
  return { email: enabled("email"), sms: enabled("sms") };
}

export default function PortalSettings() {
  const { user, isLoading } = useCurrentUser();
  const { data: { business } } = usePlatformConfig();

  const { data: settings, isLoading: loadingSettings, error, refetch } = useQuery({
    queryKey: ["customerSettings", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("customerSettings", { action: "get" });
      return res.data;
    },
    enabled: !!user && !isStaff(user.role),
  });

  const seo =     <SEO title="Settings | On The Run Electrics" description="Manage your account details, saved scooters, and connected profiles." canonical="/portal/settings" noindex />;

  if (isLoading) return <>{seo}<PageLoader label="Loading settings" fullScreen /></>;

  if (!user) {
    base44.auth.redirectToLogin(window.location.href);
    return seo;
  }

  if (isStaff(user.role)) {
    return (
      <>
      {seo}
      <UnauthorizedState title="Staff account" description="Customer settings are only available to customer accounts." actionTo="/dashboard" actionLabel="Go to dashboard" />
      </>
    );
  }

  return (
    <>
    {seo}
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="mx-auto max-w-4xl px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex min-h-11 items-center gap-2"><span className="grid place-items-center h-8 w-8 rounded-lg bg-accent/15 text-accent"><Zap className="h-4 w-4" aria-hidden="true" /></span><span className="font-heading font-extrabold">{business.name}</span></Link>
          <Button type="button" variant="ghost" size="touch" onClick={() => base44.auth.logout()}>Sign out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/portal" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to My Account</Link>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account details, saved scooters, and profiles.</p>

        <div className="mt-6 space-y-5">
          {error ? (
            <ErrorState title="Account settings could not be loaded" error={error} onRetry={refetch} />
          ) : loadingSettings ? (
            <div className="space-y-4" aria-label="Loading account settings">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <>
            <AccountDetailsCard profile={settings?.profile} onSaved={refetch} />
            <ScootersCard scooters={settings?.scooters || []} onChanged={refetch} />
            <SocialProfilesCard connections={settings?.connections || []} onChanged={refetch} />
            </>
          )}
          <FeedbackInvitationPreferences userId={user.id} />
        </div>
      </main>
    </div>
    </>
  );
}

function FeedbackInvitationPreferences({ userId }) {
  const queryClient = useQueryClient();
  const queryKey = ["feedbackInvitationPreferences", userId];
  const [announcement, setAnnouncement] = React.useState("");
  const preferencesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await base44.functions.invoke("notificationPreferenceActions", { action: "get" });
      return normalizeFeedbackPreferences(unwrapPreferenceResponse(response));
    },
    enabled: Boolean(userId),
  });
  const savePreference = useMutation({
    mutationFn: async ({ channel, enabled }) => {
      const response = await base44.functions.invoke("notificationPreferenceActions", {
        action: "set",
        channel,
        enabled,
        consent_version: FEEDBACK_CONSENT_VERSION,
      });
      return unwrapPreferenceResponse(response);
    },
    onMutate: (change) => {
      setAnnouncement(`Saving ${change.channel === "email" ? "email" : "SMS"} feedback invitation choice.`);
    },
    onSuccess: (_result, change) => {
      queryClient.setQueryData(queryKey, (current = { email: false, sms: false }) => ({ ...current, [change.channel]: change.enabled }));
      setAnnouncement(`${change.channel === "email" ? "Email" : "SMS"} feedback invitations ${change.enabled ? "enabled" : "disabled"}.`);
    },
    onError: (_error, change) => {
      setAnnouncement(`${change.channel === "email" ? "Email" : "SMS"} feedback invitation choice was not saved.`);
    },
  });

  const preferences = preferencesQuery.data || { email: false, sms: false };
  const update = (channel, enabled) => savePreference.mutate({ channel, enabled });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="feedback-invitation-preferences-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><BellRing className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 id="feedback-invitation-preferences-title" className="font-heading text-lg font-extrabold">Optional post-service feedback invitations</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose whether we may invite you to rate a completed repair. Both options are off until you turn them on.</p>
        </div>
      </div>
      <p className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
        These choices apply only to optional feedback invitations. Transactional messages about bookings, repair progress, safety, quotes, and invoices are managed separately and may still be sent when needed to provide your service.
      </p>

      {preferencesQuery.isLoading ? <CardSkeleton compact className="mt-4" label="Loading feedback invitation preferences" /> : null}
      {preferencesQuery.error ? <ErrorState className="mt-4" title="Feedback invitation choices could not be loaded" error={preferencesQuery.error} onRetry={preferencesQuery.refetch} /> : null}
      {!preferencesQuery.isLoading && !preferencesQuery.error ? (
        <div className="mt-4 divide-y divide-border rounded-xl border border-border">
          <PreferenceRow
            id="feedback-invitation-email"
            icon={Mail}
            label="Email invitations"
            description="Allow a one-time feedback link to be sent by email after an eligible completed repair."
            checked={preferences.email}
            disabled={savePreference.isPending}
            saving={savePreference.isPending && savePreference.variables?.channel === "email"}
            onCheckedChange={(enabled) => update("email", enabled)}
          />
          <PreferenceRow
            id="feedback-invitation-sms"
            icon={MessageSquareText}
            label="SMS invitations"
            description="Allow a one-time feedback link to be sent to your verified mobile after an eligible completed repair."
            checked={preferences.sms}
            disabled={savePreference.isPending}
            saving={savePreference.isPending && savePreference.variables?.channel === "sms"}
            onCheckedChange={(enabled) => update("sms", enabled)}
          />
        </div>
      ) : null}
      {savePreference.error ? (
        <ErrorState
          className="mt-4"
          title="Your feedback invitation choice was not saved"
          error={savePreference.error}
          onRetry={() => savePreference.variables && savePreference.mutate(savePreference.variables)}
        />
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </section>
  );
}

function PreferenceRow({ id, icon: Icon, label, description, checked, disabled, saving, onCheckedChange }) {
  return (
    <div className="flex min-h-20 items-center gap-3 p-4">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="cursor-pointer font-semibold">{label}</Label>
        <p id={`${id}-description`} className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {saving ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} aria-describedby={`${id}-description`} aria-label={label} />
    </div>
  );
}
