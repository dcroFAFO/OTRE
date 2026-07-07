import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BUSINESS = { name: "On The Run Electrics", footer: "On The Run Electrics · 11 Lucinda Street Woolloongabba QLD · 0415 505 908 · hello@ontherunelectrics.com.au" };

// Sends via Resend so we can reach any recipient (not just registered app users).
async function sendMail({ to, subject, body, from_name }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const recipients = String(to).split(",").map((e) => e.trim()).filter(Boolean);
  const from = `${from_name || "On The Run Electrics"} <hello@ontherunelectrics.com.au>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: recipients, subject, html: body }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
  return res.json();
}

async function sendSms({ to, body }) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!accountSid || !authToken || !from) throw new Error("Twilio SMS secrets are not set");
  if (!to) return null;

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio SMS failed: ${await res.text()}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Converts AU local numbers (04xx...) or loosely formatted numbers to E.164 so SMS aren't silently skipped.
function normalizePhoneE164(value) {
  let cleaned = String(value || "").trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+61")) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith("+")) return cleaned; // non-AU international number, use as-is
  else if (cleaned.startsWith("61")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  const phone = `+61${cleaned}`;
  return /^\+614\d{8}$/.test(phone) ? phone : "";
}

async function getSettings(base44) {
  const rows = await base44.asServiceRole.entities.NotificationSetting.list("-created_date", 1);
  return rows[0] || null;
}

async function getStaffRecipients(base44) {
  const staffProfiles = await base44.asServiceRole.entities.StaffProfile.filter({ active: true });
  const users = await base44.asServiceRole.entities.User.list();
  const staffRoles = new Set(["admin", "employee", "technician", "staff"]);
  const emails = new Set();

  staffProfiles.forEach((staff) => {
    if (staff.email) emails.add(staff.email);
  });

  users.forEach((user) => {
    const isStaffRole = staffRoles.has(user.role);
    const isStaffAccount = user.is_customer === false || user.data?.is_customer === false;
    if (user.email && (isStaffRole || isStaffAccount)) emails.add(user.email);
  });

  return [...emails];
}

function serviceLabel(job) {
  const raw = job.service_type || job.intake?.service_type || "general_repair";
  return String(raw).replace(/_/g, " ");
}

function staffBookingHtml(job) {
  const assetLabel = job.asset_label || job.scooter_label || "—";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">${BUSINESS.name}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">New Booking Request</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">A new booking has just come in. Details below.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Customer:</strong> ${job.customer_name || "—"}</td></tr>
            ${job.customer_phone ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Phone:</strong> ${job.customer_phone}</td></tr>` : ""}
            ${job.customer_email ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Email:</strong> ${job.customer_email}</td></tr>` : ""}
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            ${job.reference ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${job.reference}</td></tr>` : ""}
            ${job.issue_description ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Issue:</strong> ${job.issue_description}</td></tr>` : ""}
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">${BUSINESS.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function customerConfirmationSms(job) {
  const name = job.customer_name || "there";
  const asset = job.asset_label || job.scooter_make_model || "scooter";
  return `Hi, ${name}. We've just received your ${serviceLabel(job)} booking request for your ${asset}. One of our technicians will be in contact with you as soon as possible. Thanks, On The Run Electrics.`;
}

function customerConfirmationHtml(job) {
  const assetLabel = job.asset_label || job.scooter_make_model || "—";
  const name = job.customer_name || "there";
  const reference = job.reference || "—";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">${BUSINESS.name}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Booking Request Received</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6;">Hi ${name},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Thanks for your booking request. We've received your details and our team will review everything shortly.</p>
          <p style="margin:0 0 8px;font-size:15px;color:#1e293b;font-weight:600;">Booking details</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${reference}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Service requested:</strong> ${serviceLabel(job)}</td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:15px;color:#1e293b;font-weight:600;">What happens next?</p>
          <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
            <li>Our team will review your request and confirm a suitable drop-off date and time.</li>
            <li>Once your scooter is with us, a technician will inspect it and let you know the recommended next steps.</li>
            <li>When the work is complete, we'll send you a text to let you know your ride is ready for pickup.</li>
          </ol>
          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">You can track your job progress at any time through your <a href="https://ontherunelectrics.com.au/portal" style="color:#0ea5e9;text-decoration:none;">customer portal</a>.</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">Questions? Reply to this email or call us on <strong>0415 505 908</strong> and we'll be happy to help.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0 0 4px;font-size:12px;color:#64748b;text-align:center;font-weight:600;">On The Run Electrics</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">11 Lucinda Street, Woolloongabba QLD<br>0415 505 908<br><a href="mailto:hello@ontherunelectrics.com.au" style="color:#94a3b8;">hello@ontherunelectrics.com.au</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    let { data, event, payload_too_large } = body;

    if (event?.type !== "create") return Response.json({ skipped: "not a create event" });
    if (payload_too_large && event?.entity_id) {
      data = await base44.asServiceRole.entities.Job.get(event.entity_id);
    }
    if (!data) return Response.json({ skipped: "no job data" });

    // Idempotency guard — never send booking confirmations twice for the same job.
    if (data.booking_submission?.confirmationSentAt) {
      return Response.json({ skipped: "confirmation already sent for this job" });
    }

    const settings = await getSettings(base44);
    if (settings && settings.notify_new_booking === false) {
      return Response.json({ skipped: "new booking notifications disabled" });
    }

    const staffRecipients = await getStaffRecipients(base44);
    const reference = data.reference ? ` (${data.reference})` : "";

    // Customer confirmation first — exactly one email and one SMS per booking.
    if (data.customer_email) {
      await sendMail({
        to: data.customer_email,
        subject: `Booking Request Received | ${data.reference || ""}`.trim(),
        body: customerConfirmationHtml(data),
        from_name: BUSINESS.name,
      });
    }
    const smsTo = normalizePhoneE164(data.customer_phone_e164 || data.customer_phone);
    if (smsTo) {
      await sendSms({
        to: smsTo,
        body: customerConfirmationSms(data),
      }).catch((smsErr) => console.warn("[notifyNewBooking] customer confirmation SMS skipped:", smsErr.message));
    }

    // Mark confirmation as sent immediately so retries or duplicate triggers never re-send.
    const jobId = event?.entity_id || data.id;
    if (jobId) {
      await base44.asServiceRole.entities.Job.update(jobId, {
        booking_submission: { ...(data.booking_submission || {}), confirmationSentAt: new Date().toISOString() },
      }).catch((markErr) => console.warn("[notifyNewBooking] sent-marker update skipped:", markErr.message));
    }

    // Staff operational alert
    let first = true;
    for (const to of staffRecipients) {
      if (!first) await sleep(600);
      first = false;
      await sendMail({
        to,
        subject: `New booking request${reference}`,
        body: staffBookingHtml(data),
        from_name: BUSINESS.name,
      });
    }

    const allRecipients = [...staffRecipients, ...(data.customer_email ? [data.customer_email] : []), ...(smsTo ? [smsTo] : [])];
    console.log(`[notifyNewBooking] Sent to ${allRecipients.join(", ")}`);
    return Response.json({ sent: true, recipients: allRecipients });
  } catch (error) {
    console.error("[notifyNewBooking] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});