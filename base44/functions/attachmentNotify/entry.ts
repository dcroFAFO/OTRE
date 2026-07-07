import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Emails the customer when a customer-visible attachment (photo/document) is added to their job.

const BUSINESS = { name: "On The Run Electrics", footer: "On The Run Electrics · 11 Lucinda Street Woolloongabba QLD · 0415 505 908 · hello@ontherunelectrics.com.au", phone: "0415 505 908" };

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

function html(job, attachment) {
  const assetLabel = job?.asset_label || job?.scooter_label || "your scooter";
  const isPhoto = attachment.kind === "photo";
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f766e;padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">${BUSINESS.name}</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:24px;font-weight:700;">New ${isPhoto ? "Photo" : "File"} Added</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${job?.customer_name || "there"},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Our team has added a new ${isPhoto ? "photo" : "file"} to your scooter job for <strong>${assetLabel}</strong>.</p>
          ${isPhoto ? `<img src="${attachment.file_url}" alt="${attachment.file_name || "Photo"}" style="width:100%;max-width:496px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:16px;">` : ""}
          <p style="margin:0 0 24px;"><a href="${attachment.file_url}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:600;">View ${isPhoto ? "Photo" : "File"}</a></p>
          <p style="margin:0;font-size:14px;color:#64748b;">Questions? Reply to this email or call us on <strong>${BUSINESS.phone}</strong>.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">${BUSINESS.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);
    let { data, event, payload_too_large } = body;

    if (event?.type !== "create") return Response.json({ skipped: "not a create event" });
    if (payload_too_large && event?.entity_id) {
      data = await base44.asServiceRole.entities.Attachment.get(event.entity_id);
    }
    if (!data) return Response.json({ skipped: "no attachment data" });
    if (data.visibility !== "customer") return Response.json({ skipped: "attachment not customer-visible" });
    if (!data.job_id) return Response.json({ skipped: "no job_id" });

    const settingsRows = await base44.asServiceRole.entities.NotificationSetting.list("-created_date", 1);
    if (settingsRows[0] && settingsRows[0].notify_status_change === false) {
      return Response.json({ skipped: "customer notifications disabled" });
    }

    const job = await base44.asServiceRole.entities.Job.get(data.job_id).catch(() => null);
    if (!job) return Response.json({ skipped: "job not found" });

    const recipients = new Set(await getStaffRecipients(base44));
    if (job.customer_email) recipients.add(job.customer_email);
    if (recipients.size === 0) return Response.json({ skipped: "no recipients" });

    const ref = job.reference ? ` (${job.reference})` : "";
    const emailBody = html(job, data);
    let first = true;
    for (const to of recipients) {
      if (!first) await sleep(600);
      first = false;
      await sendMail({
        to,
        subject: `New ${data.kind === "photo" ? "photo" : "file"} on your scooter job${ref}`,
        body: emailBody,
        from_name: BUSINESS.name,
      });
    }

    console.log(`[attachmentNotify] sent to ${[...recipients].join(", ")}`);
    return Response.json({ sent: true, recipients: [...recipients] });
  } catch (error) {
    console.error("[attachmentNotify] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});