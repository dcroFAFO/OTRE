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

function appBaseUrl(req) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("host");
  return host ? `https://${host}` : "https://ontherunelectrics.com.au";
}

const NOTIFY_STATUSES = {
  repair_in_progress: {
    subject: "Your scooter is now being repaired 🔧",
    heading: "Repair In Progress",
    message: "Great news — your scooter is now on the workbench! Our technician has started working on it and we'll keep you updated.",
    sms: "Your scooter is now being repaired. Our technician has started work and we'll keep you updated.",
    color: "#0f766e",
  },
  ready_for_pickup: {
    subject: "Your scooter is ready for pickup! 🛴",
    heading: "Ready for Pickup",
    message: "Your scooter has been repaired and is ready to collect. Please come by during our opening hours: Mon–Fri 9am–5:30pm · Sat 10am–3pm.",
    sms: "Your scooter is ready for pickup. Please collect it during opening hours: Mon-Fri 9am-5:30pm, Sat 10am-3pm.",
    color: "#16a34a",
  },
  completed: {
    subject: "Your scooter job is complete ✅",
    heading: "Job Completed",
    message: "Your scooter job has been marked as completed. Thank you for choosing OTR Scooters — we hope to see you again!",
    sms: "Your scooter job is complete. Thank you for choosing On The Run Electrics.",
    color: "#2563eb",
  },
  invoice_issued: {
    subject: "Your invoice has been issued",
    heading: "Invoice Issued",
    message: "Your invoice has now been issued for this job. Please review the invoice details and arrange payment when convenient.",
    sms: "Your invoice has been issued for your scooter repair. Please review it when convenient.",
    color: "#2563eb",
  },
  paid: {
    subject: "Payment received — thank you! ✅",
    heading: "Payment Confirmed",
    message: "We've received your payment in full. Thank you for choosing OTR Scooters — we'd love to know how we did.",
    sms: "Payment received - thank you. Your scooter repair payment has been confirmed.",
    color: "#16a34a",
    includeFeedback: true,
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
    const phone = data.customer_phone_e164 || (data.customer_phone && String(data.customer_phone).trim().startsWith("+") ? String(data.customer_phone).replace(/\s+/g, "").trim() : "");
    if (!email && !phone) {
      return Response.json({ skipped: "no customer email or phone" });
    }
    const recipients = new Set(email ? [email] : []);

    const customerName = data.customer_name || "Customer";
    const reference = data.reference ? ` (${data.reference})` : "";
    const assetLabel = data.asset_label || data.scooter_label || "your scooter";
    const statusConfig = NOTIFY_STATUSES[newStatus];
    const { subject, heading, message, color } = statusConfig;
    const feedbackUrl = `${appBaseUrl(req)}/feedback?job=${encodeURIComponent(data.id)}&rating=5`;
    const feedbackBlock = statusConfig.includeFeedback ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <tr><td style="font-size:15px;color:#1e293b;font-weight:600;padding-bottom:10px;">How did we do?</td></tr>
        <tr><td style="font-size:14px;color:#475569;line-height:1.6;padding-bottom:14px;">Please rate your experience and optionally leave a note for our team.</td></tr>
        <tr><td style="font-size:26px;letter-spacing:4px;">
          <a href="${feedbackUrl}" style="color:#f59e0b;text-decoration:none;">★★★★★</a>
        </td></tr>
      </table>` : "";

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

            ${feedbackBlock}
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

    if (phone) {
      const smsReference = data.reference ? ` (${data.reference})` : "";
      await sendSms({
        to: phone,
        body: `On The Run Electrics${smsReference}: ${statusConfig.sms}`,
      }).catch((smsErr) => console.warn("[jobStatusNotify] status SMS skipped:", smsErr.message));
    }

    const sentTo = [...recipients, ...(phone ? [phone] : [])];
    console.log(`[jobStatusNotify] Notifications sent to ${sentTo.join(", ")} for status: ${newStatus}`);
    return Response.json({ sent: true, recipients: sentTo, status: newStatus });

  } catch (error) {
    console.error("[jobStatusNotify] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});