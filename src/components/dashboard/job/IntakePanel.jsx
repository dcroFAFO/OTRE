import React, { useCallback, useEffect, useId, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Loader2, CheckCircle2, Camera, X, ImageIcon, FileText } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SCOOTER_BRANDS, BRAND_NAMES } from "@/config/scooterBrands";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { format } from "date-fns";
import ScooterSpecBox from "./ScooterSpecBox";
import { DEFAULT_SERVICE_TYPE, SERVICE_TYPES } from "@/config/serviceTypes";
import { getSafeErrorMessage } from "@/lib/errors";

const BATTERY_CONDITIONS = [
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair" },
  { key: "poor", label: "Poor" },
  { key: "faulty", label: "Faulty" },
  { key: "unknown", label: "Unknown" },
];

function bookingPrefill(job) {
  const booking = job.booking_submission || {};
  return {
    customerName: booking.customerName || job.customer_name || "",
    customerEmail: booking.customerEmail || job.customer_email || "",
    customerPhone: booking.customerPhone || job.customer_phone || "",
    scooterMake: booking.scooterMake || booking.scooterBrand || "",
    scooterModel: booking.scooterModel || "",
    make: booking.scooterMake || booking.scooterBrand || "",
    model: booking.scooterModel || "",
    issueOrService: booking.issueOrService || booking.issueDescription || job.issue_description || job.issueDescription || "",
    initial_issue_notes: booking.issueOrService || booking.issueDescription || job.issue_description || job.issueDescription || "",
    service_type: job.service_type || booking.serviceType || DEFAULT_SERVICE_TYPE,
    date: booking.preferredDate || job.scheduled_date || "",
    isRideable: typeof booking.isRideable === "boolean" ? booking.isRideable : job.rideable,
    booking_files: booking.files || booking.photos || [],
  };
}

function initialIntakeForm(job) {
  return {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    scooterMake: "",
    scooterModel: "",
    make: "",
    model: "",
    serial_number: "",
    battery_condition: "",
    battery_voltage: "",
    odometer_km: "",
    physical_condition: "",
    accessories_received: "",
    powers_on: true,
    initial_issue_notes: "",
    issueOrService: "",
    service_type: DEFAULT_SERVICE_TYPE,
    date: "",
    isRideable: undefined,
    booking_files: [],
    ...bookingPrefill(job),
    ...(job.intake || {}),
  };
}

function isBookingOrIntakeFile(file) {
  const name = file.file_name || "";
  return name.startsWith("intake_") || name.startsWith("booking_upload_") || name === "Customer upload";
}

async function listPrivateAttachments(jobId) {
  const response = await base44.functions.invoke("attachmentActions", { action: "list", job_id: jobId });
  return response.data?.data?.items || [];
}

async function openPrivateAttachment(attachmentId) {
  const response = await base44.functions.invoke("attachmentActions", { action: "download", attachment_id: attachmentId });
  const signedUrl = response.data?.data?.signed_url;
  if (!signedUrl) throw new Error("File download link was not returned.");
  window.location.assign(signedUrl);
}

export default function IntakePanel({ job, actor, canEdit, onChange }) {

  const [form, setForm] = useState(() => initialIntakeForm(job));
  const [saving, setSaving] = useState(false);
  const [spec, setSpec] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState("");
  const [editingSpec, setEditingSpec] = useState(false);
  const [editableSpec, setEditableSpec] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useEffect(() => {
    setForm(initialIntakeForm(job));
  }, [job.id]);

  const loadPhotos = useCallback(async () => {
    setFilesLoading(true);
    setFilesError("");
    try {
      const rows = await listPrivateAttachments(job.id);
      setPhotos(rows.filter(isBookingOrIntakeFile));
    } catch (error) {
      setFilesError(getSafeErrorMessage(error, "Intake files could not be loaded."));
    } finally {
      setFilesLoading(false);
    }
  }, [job.id]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const uploadPhoto = async (e) => {
    if (uploading) return;
    const files = Array.from(e.target.files || []).slice(0, 5);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size <= 0 || file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} must be a JPG, PNG, or WebP image smaller than 10 MB.`);
          continue;
        }
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        const response = await base44.functions.invoke("attachmentActions", {
          action: "finalize",
          job_id: job.id,
          file_uri,
          file_name: `intake_${file.name}`,
          file_size: file.size,
          mime_type: file.type,
          kind: "photo",
          visibility: "internal",
        });
        const record = response.data?.data?.attachment;
        setPhotos((prev) => [record, ...prev]);
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The intake photo could not be uploaded."));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePhoto = async (photo) => {
    if (removingPhotoId) return;
    setRemovingPhotoId(photo.id);
    try {
      await base44.functions.invoke("attachmentActions", { action: "archive", attachment_id: photo.id, reason: "Removed from intake" });
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The intake photo could not be removed."));
    } finally {
      setRemovingPhotoId("");
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const models = form.make ? (SCOOTER_BRANDS[form.make] || []) : [];

  // Look up reference specs for the selected make/model and auto-fill battery voltage.
  useEffect(() => {
    if (!form.make || !form.model) { setSpec(null); return; }
    let cancelled = false;
    base44.entities.ScooterModel.filter({ make: form.make, model: form.model }).then((rows) => {
      if (cancelled) return;
      const match = rows?.[0] || null;
      setSpec(match);
      if (match) {
        setForm((f) => ({
          ...f,
          battery_voltage: f.battery_voltage || match.battery_voltage || "",
        }));
      }
    });
    return () => { cancelled = true; };
  }, [form.make, form.model]);

  const handleSaveClick = () => {
    if (saving) return;
    // If specs were edited, ask what to do with them
    if (editingSpec && editableSpec) {
      setSaveDialogOpen(true);
    } else {
      doSave(false);
    }
  };

  const doSave = async (updateRefDb) => {
    if (saving) return;
    setSaving(true);
    setSaveDialogOpen(false);
    try {
      const intake = {
        ...form,
        odometer_km: form.odometer_km === "" ? undefined : Number(form.odometer_km),
        intake_by_name: actor?.full_name || "Technician",
        intake_date: new Date().toISOString(),
      };
      await base44.entities.Job.update(job.id, {
        intake,
        service_type: form.service_type || DEFAULT_SERVICE_TYPE,
        ...(form.make ? { asset_label: [form.make, form.model].filter(Boolean).join(" ") } : {}),
      });

      // If technician wants to update the reference spec database
      if (updateRefDb && editableSpec && spec?.id) {
        await base44.entities.ScooterModel.update(spec.id, editableSpec);
        toast.success("Intake saved & reference specs updated");
      } else {
        toast.success("Intake saved");
      }

      // Always reflect the edited values in the panel, regardless of which option was chosen
      if (editableSpec) {
        setSpec((prev) => ({ ...prev, ...editableSpec }));
        // Sync spec fields that map to intake form fields
        if (editableSpec.battery_voltage) {
          setForm((f) => ({ ...f, battery_voltage: editableSpec.battery_voltage }));
        }
      }
      setEditingSpec(false);
      setEditableSpec(null);
      onChange?.();
    } catch (e) {
      logError("Save intake failed", e, { recordId: job.id });
      toast.error("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return <IntakeReadOnly intake={job.intake} jobId={job.id} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardCheck className="h-4 w-4 text-accent" /> Scooter intake
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Customer name">
          <Input value={form.customerName || ""} onChange={(e) => set("customerName", e.target.value)} placeholder="Customer name" />
        </Field>
        <Field label="Customer email">
          <Input type="email" value={form.customerEmail || ""} onChange={(e) => set("customerEmail", e.target.value)} placeholder="Customer email" />
        </Field>
        <Field label="Customer phone">
          <Input value={form.customerPhone || ""} onChange={(e) => set("customerPhone", e.target.value)} placeholder="Customer phone" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Make / brand">
          <Select value={form.make || ""} onValueChange={(v) => { setForm((f) => ({ ...f, make: v, scooterMake: v, model: "", scooterModel: "" })); }}>
            <SelectTrigger><SelectValue placeholder="Select make" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {BRAND_NAMES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Model">
          {models.length > 0 ? (
            <Select value={form.model || ""} onValueChange={(v) => setForm((f) => ({ ...f, model: v, scooterModel: v }))}>
              <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.model || ""} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value, scooterModel: e.target.value }))} placeholder="Model" />
          )}
        </Field>
      </div>

      <ScooterSpecBox
        spec={spec}
        editableSpec={editableSpec}
        isEditing={editingSpec}
        onEditStart={() => { setEditableSpec({ ...spec }); setEditingSpec(true); }}
        onEditCancel={() => { setEditingSpec(false); setEditableSpec(null); }}
        onEditableSpecChange={(key, val) => setEditableSpec((prev) => ({ ...prev, [key]: val }))}
      />

      <Field label="Serial / frame number">
        <Input value={form.serial_number || ""} onChange={(e) => set("serial_number", e.target.value)} placeholder="e.g. SN-12345678" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Battery condition">
          <Select value={form.battery_condition || ""} onValueChange={(v) => set("battery_condition", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {BATTERY_CONDITIONS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Battery voltage">
          <Input value={form.battery_voltage || ""} onChange={(e) => set("battery_voltage", e.target.value)} placeholder="e.g. 54.6V" />
        </Field>
        <Field label="Odometer (km)">
          <Input type="number" value={form.odometer_km ?? ""} onChange={(e) => set("odometer_km", e.target.value)} placeholder="0" />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <Label htmlFor="job-intake-powers-on" className="text-sm">Powers on at intake</Label>
        <Switch id="job-intake-powers-on" checked={!!form.powers_on} onCheckedChange={(v) => set("powers_on", v)} />
      </div>

      <Field label="Physical condition / existing damage">
        <Textarea value={form.physical_condition || ""} onChange={(e) => set("physical_condition", e.target.value)} placeholder="Scratches, dents, worn tyres..." className="h-20" />
      </Field>

      <Field label="Accessories received">
        <Input value={form.accessories_received || ""} onChange={(e) => set("accessories_received", e.target.value)} placeholder="Charger, key, phone mount..." />
      </Field>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Preferred date">
          <Input type="date" value={form.date || ""} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Scooter rideable?">
          <Select value={form.isRideable === true ? "yes" : form.isRideable === false ? "no" : ""} onValueChange={(v) => set("isRideable", v === "yes")}>
            <SelectTrigger><SelectValue placeholder="Not provided" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Service type">
        <Select value={form.service_type || DEFAULT_SERVICE_TYPE} onValueChange={(v) => set("service_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select service type" /></SelectTrigger>
          <SelectContent className="max-h-72">
            {SERVICE_TYPES.map((type) => <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Issue / requested service">
        <Textarea
          value={form.initial_issue_notes || ""}
          onChange={(e) => setForm((f) => ({ ...f, initial_issue_notes: e.target.value, issueOrService: e.target.value }))}
          placeholder="Customer's reported issue or requested service..."
          className="h-24"
        />
      </Field>

      {/* Booking and intake files */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-medium"><Camera className="h-3.5 w-3.5" aria-hidden="true" /> Booking & intake files</p>
          <label className="flex min-h-11 cursor-pointer items-center gap-1.5 text-xs font-medium text-accent hover:opacity-80">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Add photos"}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={uploadPhoto} disabled={uploading} />
          </label>
        </div>
        {filesError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
            <span>{filesError}</span>
            <Button type="button" variant="outline" size="touch" className="text-xs sm:h-9" onClick={loadPhotos}>Try again</Button>
          </div>
        ) : null}
        {filesLoading && photos.length === 0 ? (
          <p className="text-xs text-muted-foreground" role="status">Loading intake files...</p>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-secondary">
                <button type="button" onClick={() => void openPrivateAttachment(p.id)} className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-xs text-muted-foreground">
                  {p.kind === "photo" ? <ImageIcon className="h-6 w-6" aria-hidden="true" /> : <FileText className="h-6 w-6" aria-hidden="true" />}
                  <span className="line-clamp-3">{p.file_name || "Booking file"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(p)}
                  disabled={Boolean(removingPhotoId)}
                  aria-label={`Remove ${p.file_name || "intake file"}`}
                  className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white transition-opacity sm:h-9 sm:w-9 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  {removingPhotoId === p.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 transition-colors hover:border-accent/50">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload intake photos</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={uploadPhoto} disabled={uploading} />
          </label>
        )}
      </div>

      {job.intake?.intake_date && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Last completed by {job.intake.intake_by_name || "—"} · {format(new Date(job.intake.intake_date), "d MMM yyyy, h:mm a")}
        </p>
      )}

      <Button type="button" size="touch" className="w-full gap-2" disabled={saving} onClick={handleSaveClick}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving..." : "Save intake"}
      </Button>

      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save reference specs?</AlertDialogTitle>
            <AlertDialogDescription>
              You've edited the reference specs for <strong>{spec?.make} {spec?.model}</strong>. Would you like to update the reference spec database for all future jobs, or save these values for this job only?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => doSave(false)}>This job only</AlertDialogCancel>
            <AlertDialogAction onClick={() => doSave(true)}>Update reference database</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IntakeReadOnly({ intake, jobId }) {
  const [photos, setPhotos] = useState([]);
  useEffect(() => {
    if (!jobId) return;
    listPrivateAttachments(jobId)
      .then((rows) => setPhotos(rows.filter(isBookingOrIntakeFile)));
  }, [jobId]);

  if (!intake || !intake.intake_date) {
    return <p className="text-sm text-muted-foreground text-center py-8">No intake recorded yet.</p>;
  }
  const rows = [
    ["Customer name", intake.customerName],
    ["Customer email", intake.customerEmail],
    ["Customer phone", intake.customerPhone],
    ["Make", intake.make || intake.scooterMake],
    ["Model", intake.model || intake.scooterModel],
    ["Serial number", intake.serial_number],
    ["Service type", SERVICE_TYPES.find((type) => type.key === intake.service_type)?.label],
    ["Battery condition", intake.battery_condition],
    ["Battery voltage", intake.battery_voltage],
    ["Odometer", intake.odometer_km != null ? `${intake.odometer_km} km` : null],
    ["Powers on", intake.powers_on ? "Yes" : "No"],
    ["Preferred date", intake.date],
    ["Rideable", intake.isRideable === true ? "Yes" : intake.isRideable === false ? "No" : null],
    ["Physical condition", intake.physical_condition],
    ["Accessories", intake.accessories_received],
    ["Issue / requested service", intake.initial_issue_notes || intake.issueOrService],
  ].filter(([, v]) => v != null && v !== "");

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-2 text-sm border-b border-border/60 py-1.5">
            <span className="text-muted-foreground">{label}</span>
            <span className="col-span-2 capitalize">{value}</span>
          </div>
        ))}
      </div>
      {photos.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Camera className="h-3 w-3" /> Booking & intake files</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <button key={p.id} type="button" onClick={() => void openPrivateAttachment(p.id)}
                className="flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-border bg-secondary p-3 text-center text-xs text-muted-foreground">
                {p.kind === "photo" ? <ImageIcon className="h-6 w-6" aria-hidden="true" /> : <FileText className="h-6 w-6" aria-hidden="true" />}
                <span className="line-clamp-3">{p.file_name || "Booking file"}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  const id = `job-intake-${useId().replace(/:/g, "")}`;
  let control;
  if (children.type === Select) {
    const selectChildren = React.Children.map(children.props.children, (child, index) => (
      index === 0 && React.isValidElement(child) ? React.cloneElement(child, { id: child.props.id || id }) : child
    ));
    control = React.cloneElement(children, {}, selectChildren);
  } else {
    control = React.cloneElement(children, { id: children.props.id || id });
  }
  return <div className="space-y-1.5"><Label htmlFor={id} className="text-xs">{label}</Label>{control}</div>;
}
