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
  const assetLabel = job.asset_label || job.scooter_label || "—";
  const scheduledLine = job.preferred_time_window
    ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Preferred time:</strong> ${job.preferred_time_window}</td></tr>`
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
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">Hi ${customerName}, thanks for getting in touch! We've received your booking request and will be in touch shortly to confirm a time.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${job.reference}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Issue:</strong> ${job.issue_description || "—"}</td></tr>
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

Deno.serve(async (req) => {
  // requestMeta lets the catch block log a useful, PII-free summary on failure
  // (field names only — never customer details).
  const requestMeta = { fn: "createBooking" };
  try {
    const base44 = createClientFromRequest(req);
    const form = await req.json();
    requestMeta.fields = Object.keys(form || {});

    if (!form.customer_name || !form.email || !form.issue_description) {
      return Response.json({ error: "customer_name, email and issue_description are required" }, { status: 400 });
    }

    const db = base44.asServiceRole.entities;
    const reference = `${SLUG.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const job = await db.Job.create({
      reference,
      customer_name: form.customer_name,
      customer_email: form.email,
      customer_phone: form.phone,
      scooter_label: form.asset_label || form.scooter_label,
      asset_label: form.asset_label || form.scooter_label,
      issue_description: form.issue_description,
      job_type: JOB_TYPE,
      status: INTAKE_STATUS,
      scheduled_date: form.asap ? null : (form.preferred_date || null),
      preferred_time_window: form.asap ? "ASAP" : form.preferred_time_window,
      rideable: form.rideable,
      business_slug: SLUG,
    });

    if (form.photo_url) {
      await db.Attachment.create({
        job_id: job.id,
        file_url: form.photo_url,
        file_name: "Customer upload",
        kind: "photo",
        visibility: "customer",
        uploaded_by_name: form.customer_name,
      });
    }

    await db.AuditEvent.create({
      event_type: "booking_created",
      job_id: job.id,
      actor_name: "System",
      actor_role: "system",
      summary: `Booking request received from ${form.customer_name}`,
      visibility: "system",
    });

    // Send confirmation email to customer (non-blocking — don't fail the booking if email errors)
    if (form.email) {
      sendConfirmationEmail({ to: form.email, customerName: form.customer_name, job }).catch((e) => {
        console.error("[createBooking] Confirmation email error:", e.message);
      });
    }

    return Response.json(job);
  } catch (error) {
    // Structured server-side error log — inspect in dashboard → Code → Functions → logs.
    console.error("[createBooking] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    // Public endpoint — never expose internal error details to visitors.
    return Response.json({ error: "Sorry — we couldn't submit your booking just now. Please try again." }, { status: 500 });
  }
});