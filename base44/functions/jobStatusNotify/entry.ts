import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

async function getStaffRecipients(base44) {
  const staff = await base44.asServiceRole.entities.StaffProfile.filter({ active: true });
  return staff
    .filter((s) => s.email && ["admin", "technician"].includes(s.role))
    .map((s) => s.email);
}

const NOTIFY_STATUSES = {
  repair_in_progress: {
    subject: "Your scooter is now being repaired 🔧",
    heading: "Repair In Progress",
    message: "Great news — your scooter is now on the workbench! Our technician has started working on it and we'll keep you updated.",
    color: "#0f766e",
  },
  ready_for_pickup: {
    subject: "Your scooter is ready for pickup! 🛴",
    heading: "Ready for Pickup",
    message: "Your scooter has been repaired and is ready to collect. Please come by during our opening hours: Mon–Fri 9am–5:30pm · Sat 10am–3pm.",
    color: "#16a34a",
  },
  completed: {
    subject: "Your scooter job is complete ✅",
    heading: "Job Completed",
    message: "Your scooter job has been marked as completed. Thank you for choosing OTR Scooters — we hope to see you again!",
    color: "#2563eb",
  },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const { data, old_data, event } = body;

    // Only act on update events
    if (event?.type !== "update") {
      return Response.json({ skipped: "not an update event" });
    }

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    // Only notify on relevant status transitions
    if (!newStatus || newStatus === oldStatus || !NOTIFY_STATUSES[newStatus]) {
      return Response.json({ skipped: "status not in notify list or unchanged" });
    }

    // Respect the admin toggle
    const settingsRows = await base44.asServiceRole.entities.NotificationSetting.list("-created_date", 1);
    if (settingsRows[0] && settingsRows[0].notify_status_change === false) {
      return Response.json({ skipped: "status change notifications disabled" });
    }

    const email = data.customer_email;
    const recipients = new Set(await getStaffRecipients(base44));
    if (email) recipients.add(email);
    if (recipients.size === 0) {
      return Response.json({ skipped: "no recipients" });
    }

    const customerName = data.customer_name || "Customer";
    const reference = data.reference ? ` (${data.reference})` : "";
    const assetLabel = data.asset_label || data.scooter_label || "your scooter";
    const { subject, heading, message, color } = NOTIFY_STATUSES[newStatus];

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${color};padding:28px 32px;">
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">OTR Scooters</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">${heading}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${customerName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${message}</p>

            <!-- Job info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <tr>
                <td style="padding:4px 0;">
                  <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Scooter</span><br>
                  <span style="font-size:15px;color:#1e293b;font-weight:500;">${assetLabel}</span>
                </td>
              </tr>
              ${data.reference ? `<tr><td style="padding:8px 0 4px;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Job Reference</span><br>
                <span style="font-size:15px;color:#1e293b;font-weight:500;">${data.reference}</span>
              </td></tr>` : ""}
              <tr>
                <td style="padding:8px 0 4px;">
                  <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Status</span><br>
                  <span style="font-size:15px;color:${color};font-weight:600;">${heading}</span>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#64748b;">Questions? Reply to this email or call us on <strong>(03) 9000 1234</strong>.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    let first = true;
    for (const to of recipients) {
      if (!first) await sleep(600);
      first = false;
      await sendMail({
        to,
        subject: `${subject}${reference}`,
        body: htmlBody,
        from_name: "OTR Scooters",
      });
    }

    // On completion, also send a short feedback / review request.
    if (newStatus === "completed") {
      const feedbackHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#f59e0b;padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">OTR Scooters</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:700;">How did we do? ⭐</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${customerName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Thanks for choosing OTR Scooters for your repair on <strong>${assetLabel}</strong>. We'd love to hear how it went — your feedback helps us keep improving.</p>
          <p style="margin:0 0 8px;font-size:15px;color:#1e293b;font-weight:600;">Rate your experience:</p>
          <p style="margin:0 0 24px;font-size:28px;letter-spacing:6px;">
            <a href="mailto:hello@otrscooters.com?subject=Review%20${data.reference || ""}%20-%205%20stars" style="text-decoration:none;">⭐⭐⭐⭐⭐</a>
          </p>
          <p style="margin:0;font-size:14px;color:#64748b;">Just reply to this email with any comments, or call us on <strong>(03) 9000 1234</strong>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
      await sleep(600);
      await sendMail({
        to: email,
        subject: `How did we do?${reference}`,
        body: feedbackHtml,
        from_name: "OTR Scooters",
      });
      console.log(`[jobStatusNotify] Feedback request sent to ${email}`);
    }

    console.log(`[jobStatusNotify] Email sent to ${[...recipients].join(", ")} for status: ${newStatus}`);
    return Response.json({ sent: true, recipients: [...recipients], status: newStatus });

  } catch (error) {
    console.error("[jobStatusNotify] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});