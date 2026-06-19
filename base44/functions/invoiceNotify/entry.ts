import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BUSINESS = { name: "OTR Scooters", footer: "OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com" };

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

const STATES = {
  outstanding: {
    subject: "Your invoice is ready",
    heading: "Invoice Received",
    message: "Your invoice has been issued and is now outstanding. Please arrange payment at your convenience.",
    color: "#dc2626",
  },
  paid: {
    subject: "Payment received — thank you! ✅",
    heading: "Invoice Settled",
    message: "We've received your payment in full. Thank you for choosing OTR Scooters!",
    color: "#16a34a",
  },
};

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

function invoiceHtml({ heading, message, color }, invoice, currency, amount) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:${color};padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">${BUSINESS.name}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${message}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Invoice:</strong> ${invoice.number || "—"}</td></tr>
            <tr><td style="padding:6px 0;font-size:18px;color:${color};font-weight:700;">${currency} ${amount.toFixed(2)}</td></tr>
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
    let { data, old_data, event, payload_too_large } = body;

    if (payload_too_large && event?.entity_id) {
      data = await base44.asServiceRole.entities.Invoice.get(event.entity_id);
    }
    if (!data) return Response.json({ skipped: "no invoice data" });

    const newStatus = data.status;
    const oldStatus = old_data?.status;

    // On create, notify for the initial status; on update, only when status changes.
    const isCreate = event?.type === "create";
    if (!isCreate && newStatus === oldStatus) {
      return Response.json({ skipped: "status unchanged" });
    }
    if (!STATES[newStatus]) return Response.json({ skipped: "status not in notify list" });

    const settings = await getSettings(base44);
    if (settings && settings.notify_invoice === false) {
      return Response.json({ skipped: "invoice notifications disabled" });
    }

    const job = data.job_id ? await base44.asServiceRole.entities.Job.get(data.job_id).catch(() => null) : null;
    const currency = data.currency || "AUD";
    const amount = data.amount || 0;
    const state = STATES[newStatus];

    const recipients = new Set(await getStaffRecipients(base44));
    if (job?.customer_email) recipients.add(job.customer_email);
    if (recipients.size === 0) return Response.json({ skipped: "no recipients" });

    const html = invoiceHtml(state, data, currency, amount);
    let first = true;
    for (const to of recipients) {
      if (!first) await sleep(600);
      first = false;
      await sendMail({
        to,
        subject: `${state.subject}${data.number ? ` — ${data.number}` : ""}`,
        body: html,
        from_name: BUSINESS.name,
      });
    }

    console.log(`[invoiceNotify] Sent (${newStatus}) to ${[...recipients].join(", ")}`);
    return Response.json({ sent: true, status: newStatus, recipients: [...recipients] });
  } catch (error) {
    console.error("[invoiceNotify] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});