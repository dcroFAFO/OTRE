import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BUSINESS = { name: "OTR Scooters", footer: "OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com" };

async function getSettings(base44) {
  const rows = await base44.asServiceRole.entities.NotificationSetting.list("-created_date", 1);
  return rows[0] || null;
}

function bookingHtml(job) {
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

    const recipients = new Set();
    if (settings?.admin_inbox) recipients.add(settings.admin_inbox);
    if (settings?.notify_staff_on_booking !== false && data.assigned_technician_id) {
      const staff = await base44.asServiceRole.entities.StaffProfile.get(data.assigned_technician_id).catch(() => null);
      if (staff?.email) recipients.add(staff.email);
    }
    if (recipients.size === 0) return Response.json({ skipped: "no recipients configured" });

    const html = bookingHtml(data);
    const reference = data.reference ? ` (${data.reference})` : "";
    for (const to of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to,
        subject: `New booking request${reference}`,
        body: html,
        from_name: BUSINESS.name,
      });
    }

    console.log(`[notifyNewBooking] Sent to ${[...recipients].join(", ")}`);
    return Response.json({ sent: true, recipients: [...recipients] });
  } catch (error) {
    console.error("[notifyNewBooking] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});