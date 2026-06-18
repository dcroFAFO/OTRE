import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Routes email notifications off AuditEvent records.
// - Customer-facing events (quote generated/sent, customer notes) email the customer.
// - quote_approved emails staff/admin so they know to start the repair.

const BUSINESS = { name: "OTR Scooters", footer: "OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com", phone: "(03) 9000 1234" };

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

// Map audit event_type -> notification config.
// audience: "customer" | "staff"
const EVENT_MAP = {
  quote_generated: { audience: "customer", subject: "Your repair quote is ready", heading: "Quote Ready", color: "#7c3aed",
    message: "We've prepared a quote for your scooter repair. Please review it and let us know if you'd like us to proceed." },
  quote_sent: { audience: "customer", subject: "Your repair quote is ready", heading: "Quote Ready", color: "#7c3aed",
    message: "We've prepared a quote for your scooter repair. Please review it and let us know if you'd like us to proceed." },
  customer_note_added: { audience: "customer", subject: "Update on your scooter repair", heading: "New Update", color: "#0f766e",
    message: "There's a new update on your scooter job from our team." },
  quote_approved: { audience: "staff", subject: "Quote approved — ready to start", heading: "Quote Approved", color: "#16a34a",
    message: "A customer has approved their repair quote. The job is ready to be scheduled and started." },
};

function emailHtml({ heading, message, color }, job, extra = "") {
  const assetLabel = job?.asset_label || job?.scooter_label || "your scooter";
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:${color};padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">${BUSINESS.name}</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:700;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${job?.customer_name || "there"},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${message}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:8px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            ${job?.reference ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${job.reference}</td></tr>` : ""}
          </table>
          ${extra}
          <p style="margin:24px 0 0;font-size:14px;color:#64748b;">Questions? Reply to this email or call us on <strong>${BUSINESS.phone}</strong>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">${BUSINESS.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function getSettings(base44) {
  const rows = await base44.asServiceRole.entities.NotificationSetting.list("-created_date", 1);
  return rows[0] || null;
}

async function staffRecipients(base44) {
  const staff = await base44.asServiceRole.entities.StaffProfile.filter({ active: true });
  return staff
    .filter((s) => s.email && ["admin", "technician"].includes(s.role))
    .map((s) => s.email);
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    let { data, event, payload_too_large } = body;

    if (event?.type !== "create") return Response.json({ skipped: "not a create event" });
    if (payload_too_large && event?.entity_id) {
      data = await base44.asServiceRole.entities.AuditEvent.get(event.entity_id);
    }
    if (!data) return Response.json({ skipped: "no audit data" });

    const cfg = EVENT_MAP[data.event_type];
    if (!cfg) return Response.json({ skipped: `event_type ${data.event_type} not notifiable` });
    if (!data.job_id) return Response.json({ skipped: "no job_id on event" });

    const settings = await getSettings(base44);
    if (settings && settings.notify_status_change === false && cfg.audience === "customer") {
      return Response.json({ skipped: "customer notifications disabled" });
    }

    const job = await base44.asServiceRole.entities.Job.get(data.job_id).catch(() => null);
    if (!job) return Response.json({ skipped: "job not found" });

    const recipients = new Set(await staffRecipients(base44));
    let extra = "";
    if (cfg.audience === "customer") {
      if (job.customer_email) recipients.add(job.customer_email);
      if (data.event_type === "customer_note_added" && data.summary) {
        // Pull the latest customer-visible note body for richer content.
        const notes = await base44.asServiceRole.entities.JobNote
          .filter({ job_id: job.id, visibility: "customer" }, "-created_date", 1).catch(() => []);
        if (notes[0]?.body) {
          extra = `<table width="100%" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;"><tr><td style="font-size:14px;color:#475569;line-height:1.6;">${notes[0].body}</td></tr></table>`;
        }
      }
    }

    if (recipients.size === 0) return Response.json({ skipped: "no recipients" });

    const html = emailHtml(cfg, job, extra);
    const ref = job.reference ? ` (${job.reference})` : "";
    for (const to of recipients) {
      await base44.asServiceRole.functions.invoke('sendMail', {
        to, subject: `${cfg.subject}${ref}`, body: html, from_name: BUSINESS.name,
      });
    }

    console.log(`[auditNotify] ${data.event_type} -> ${[...recipients].join(", ")}`);
    return Response.json({ sent: true, event_type: data.event_type, recipients: [...recipients] });
  } catch (error) {
    console.error("[auditNotify] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});