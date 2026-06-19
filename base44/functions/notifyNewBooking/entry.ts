import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BUSINESS = { name: "OTR Scooters", footer: "OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com" };

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function customerConfirmationHtml(job) {
  const assetLabel = job.asset_label || job.scooter_label || "—";
  const firstName = (job.customer_name || "there").split(" ")[0];
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
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Booking Confirmed</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#1e293b;line-height:1.6;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Thanks for your booking request — we've received it and our team will be in touch shortly to confirm your appointment.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${reference}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            ${job.issue_description ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Issue reported:</strong> ${job.issue_description}</td></tr>` : ""}
          </table>
          <p style="margin:0 0 8px;font-size:15px;color:#1e293b;font-weight:600;">What happens next?</p>
          <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#475569;line-height:1.8;">
            <li>Our team will review your request and confirm your appointment time.</li>
            <li>Once we have your scooter, a technician will diagnose the issue and send you a quote.</li>
            <li>After you approve the quote, we'll complete the repair and let you know when it's ready for pickup.</li>
          </ol>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">You can track your job progress at any time via your <a href="https://ontherunelectrics.com.au/portal" style="color:#0ea5e9;text-decoration:none;">customer portal</a>.</p>
          <p style="margin:16px 0 0;font-size:14px;color:#475569;line-height:1.6;">Questions? Reply to this email or call us and we'll be happy to help.</p>
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

    const settings = await getSettings(base44);
    if (settings && settings.notify_new_booking === false) {
      return Response.json({ skipped: "new booking notifications disabled" });
    }

    const staffRecipients = await getStaffRecipients(base44);
    const reference = data.reference ? ` (${data.reference})` : "";

    // Send staff operational alert
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

    // Send customer confirmation (separate, friendly email)
    if (data.customer_email) {
      if (staffRecipients.length > 0) await sleep(600);
      await sendMail({
        to: data.customer_email,
        subject: `Booking confirmed${reference} — ${BUSINESS.name}`,
        body: customerConfirmationHtml(data),
        from_name: BUSINESS.name,
      });
    }

    const allRecipients = [...staffRecipients, ...(data.customer_email ? [data.customer_email] : [])];
    console.log(`[notifyNewBooking] Sent to ${allRecipients.join(", ")}`);
    return Response.json({ sent: true, recipients: allRecipients });
  } catch (error) {
    console.error("[notifyNewBooking] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});