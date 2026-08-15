import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { createBookingRequest } from "@/services/bookingService";
import { normalizePhoneToE164 } from "@/lib/phone";
import BookingWizard from "@/components/portal/booking/BookingWizard";
import BookingConfirmation from "@/components/portal/booking/BookingConfirmation";
import { ErrorState } from "@/components/shared";

export default function CustomerBookingModal({ open, onClose, user, profile, profileLoading = false, profileError, onRetryProfile, scooters = [], scootersLoading = false, scootersError, onRetryScooters, onSuccess, onManage }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [wizardKey, setWizardKey] = useState(0);

  const handleSubmit = async (data, scooterLabel) => {
    if (submitting) return;
    setError(null);
    const isOther = data.service === "Other";
    const service = isOther ? data.customIssue.trim() : data.service;
    const normalized = normalizePhoneToE164(profile?.phone_e164 || data.phone);
    if (!normalized.is_valid) {
      setError("Enter a valid Australian mobile number so we can contact you.");
      return;
    }
    setSubmitting(true);
    try {
      const make = data.scooter ? data.scooter.make : (data.newScooter.make === "Other" ? data.newScooter.customMake : data.newScooter.make);
      const model = data.scooter ? data.scooter.model : (data.newScooter.model === "Other model" ? data.newScooter.customModel : data.newScooter.model);
      const issue_description = data.notes.trim() ? `${service}\n\nAdditional notes: ${data.notes.trim()}` : service;
      const res = await createBookingRequest({
        customer_name: profile?.display_name || profile?.full_name || user?.full_name,
        customer_email: user?.email,
        phone: normalized.phone_e164,
        phone_e164: normalized.phone_e164,
        customer_phone_e164: normalized.phone_e164,
        asset_label: scooterLabel,
        scooterMake: make,
        scooterModel: model,
        serial_number: data.scooter?.serial_number || "",
        colour: data.scooter?.colour || data.scooter?.color || "",
        serviceRequested: service,
        issue_description,
        rideable: true,
        preferred_date: data.preferredDate || "",
      });
      setSummary({ scooterLabel, service });
      setDone(res);
      onSuccess?.();
    } catch (err) {
      setError("Sorry — we couldn't submit your booking. Your details are still here, so please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setDone(null);
    setSummary(null);
    setError(null);
    setWizardKey((k) => k + 1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-extrabold">{done ? "Request received" : "Book a repair"}</DialogTitle>
          <DialogDescription>{done ? "Your repair request has been saved." : "Choose a scooter, service, preferred details, and review before submitting."}</DialogDescription>
        </DialogHeader>

        {profileLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading your profile…
          </div>
        ) : profileError ? (
          <ErrorState title="Your booking details could not be loaded" error={profileError} onRetry={onRetryProfile} />
        ) : done ? (
          <BookingConfirmation
            result={done}
            summary={summary}
            onManage={() => { const id = done.job_id; handleClose(); onManage?.(id); }}
            onBack={handleClose}
          />
        ) : (
          <>
            <BookingWizard
              key={wizardKey}
              user={user}
              profile={profile}
              scooters={scooters}
              scootersLoading={scootersLoading}
              scootersError={scootersError}
              onRetryScooters={onRetryScooters}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
             {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
