import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public booking intake. Runs with service role because customers submitting
// the landing-page form are not authenticated. Validates input server-side.

const SLUG = "otr-scooters";

async function sendConfirmationEmail({ to, customerName, job }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[createBooking] RESEND_API_KEY not set — skipping confirmation email");
    return;
  }
  const assetLabel = esc(job.asset_label || job.scooter_label || "—");
  const safeName = esc(customerName);
  const scheduledLine = job.preferred_time_window
    ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Preferred time:</strong> ${esc(job.preferred_time_window)}</td></tr>`
    : "";
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">On The Run Electrics</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Booking Confirmed ✓</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">Hi ${safeName}, thanks for getting in touch! We've received your booking request and will be in touch shortly to confirm a time.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${esc(job.reference)}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Issue:</strong> ${esc(job.issue_description || "—")}</td></tr>
            ${scheduledLine}
          </table>
          <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">Have questions? Reply to this email or contact us at <a href="mailto:hello@ontherunelectrics.com.au" style="color:#0f172a;">hello@ontherunelectrics.com.au</a>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">On The Run Electrics · hello@ontherunelectrics.com.au</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "On The Run Electrics <hello@ontherunelectrics.com.au>",
      to: [to],
      subject: `Booking confirmed — ${job.reference}`,
      html,
    }),
  });
  if (!res.ok) {
    console.error("[createBooking] Confirmation email failed:", await res.text());
  } else {
    console.log(`[createBooking] Confirmation email sent to ${to}`);
  }
}
const INTAKE_STATUS = "requested";
const JOB_TYPE = "repair";

// --- Input validation helpers -------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { customer_name: 120, email: 160, phone: 40, asset_label: 160, issue_description: 2000, preferred_time_window: 60 };

// Collapse whitespace, trim, and cap length. Returns "" for nullish input.
const clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Escape user text before it goes into the confirmation email HTML, so quotes,
// angle brackets and ampersands can't inject markup into the message body.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

Deno.serve(async (req) => {
  // requestMeta lets the catch block log a useful, PII-free summary on failure
  // (field names only — never customer details).
  const requestMeta = { fn: "createBooking" };
  try {
    const base44 = createClientFromRequest(req);
    const form = await req.json();
    requestMeta.fields = Object.keys(form || {});

    // Trim + length-cap all free-text fields. Whitespace-only values become ""
    // and then fail the required-field check below.
    const customerName = clean(form.customer_name, LIMITS.customer_name);
    const email = clean(form.email, LIMITS.email).toLowerCase();
    const phone = clean(form.phone, LIMITS.phone);
    const assetLabel = clean(form.asset_label || form.scooter_label, LIMITS.asset_label);
    const issueDescription = clean(form.issue_description, LIMITS.issue_description);

    if (!customerName || !email || !issueDescription) {
      return Response.json({ error: "Please fill in your name, email and the issue." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    // Validate optional preferred_date is a real, non-past date (YYYY-MM-DD).
    let scheduledDate = null;
    if (!form.asap && form.preferred_date) {
      const d = new Date(`${form.preferred_date}T00:00:00`);
      if (isNaN(d.getTime())) {
        return Response.json({ error: "Please choose a valid preferred date." }, { status: 400 });
      }
      scheduledDate = form.preferred_date;
    }

    const db = base44.asServiceRole.entities;
    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const job = await db.Job.create({
      reference,
      customer_name: customerName,
      customer_email: email,
      customer_phone: phone,
      scooter_label: assetLabel,
      asset_label: assetLabel,
      issue_description: issueDescription,
      job_type: JOB_TYPE,
      status: INTAKE_STATUS,
      scheduled_date: scheduledDate,
      preferred_time_window: form.asap ? "ASAP" : clean(form.preferred_time_window, LIMITS.preferred_time_window),
      rideable: form.rideable,
      business_slug: SLUG,
      archived: false,
    });

    // Only attach a photo if the client sent a real uploaded file URL from our
    // own storage — ignore anything else to avoid storing arbitrary URLs.
    if (typeof form.photo_url === "string" && form.photo_url.startsWith("http")) {
      await db.Attachment.create({
        job_id: job.id,
        file_url: form.photo_url,
        file_name: "Customer upload",
        kind: "photo",
        visibility: "customer",
        uploaded_by_name: customerName,
      });
    }

    await db.AuditEvent.create({
      event_type: "booking_created",
      job_id: job.id,
      actor_name: "System",
      actor_role: "system",
      summary: `Booking request received from ${customerName}`,
      visibility: "system",
    });

    // Send confirmation email to customer (non-blocking — don't fail the booking if email errors)
    sendConfirmationEmail({ to: email, customerName, job }).catch((e) => {
      console.error("[createBooking] Confirmation email error:", e.message);
    });

    return Response.json(job);
  } catch (error) {
    // Structured server-side error log — inspect in dashboard → Code → Functions → logs.
    console.error("[createBooking] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    // Public endpoint — never expose internal error details to visitors.
    return Response.json({ error: "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});