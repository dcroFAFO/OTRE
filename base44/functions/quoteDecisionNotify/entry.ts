import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BUSINESS = {
  name: "OTR Scooters",
  footer: "OTR Scooters · 12 Workshop Lane, Melbourne VIC · hello@otrscooters.com",
};

async function sendMail({ to, subject, body, from_name }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  const recipients = String(to).split(",").map((email) => email.trim()).filter(Boolean);
  const from = `${from_name || "On The Run Electrics"} <hello@ontherunelectrics.com.au>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: recipients, subject, html: body }),
  });

  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
  return res.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function decisionDetails(approvalStatus, status) {
  const decision = approvalStatus || status;
  if (decision === "approved") {
    return {
      label: "approved",
      heading: "Quote Approved",
      subject: "Quote approved by customer",
      color: "#16a34a",
      message: "A customer has approved their repair quote. The job is ready to be scheduled and started.",
    };
  }

  if (decision === "rejected") {
    return {
      label: "rejected",
      heading: "Quote Rejected",
      subject: "Quote rejected by customer",
      color: "#dc2626",
      message: "A customer has rejected their repair quote. Please review the job and follow up if needed.",
    };
  }

  return null;
}

function staffQuoteDecisionHtml(details, quote, job) {
  const assetLabel = job?.asset_label || job?.scooter_label || "—";
  const total = Number(quote.total || quote.parts_estimate || 0);
  const currency = quote.currency || "AUD";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:${details.color};padding:28px 32px;">
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">${BUSINESS.name}</p>
          <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">${details.heading}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${details.message}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;">
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Customer:</strong> ${job?.customer_name || "—"}</td></tr>
            ${job?.customer_email ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Email:</strong> ${job.customer_email}</td></tr>` : ""}
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Scooter:</strong> ${assetLabel}</td></tr>
            ${job?.reference ? `<tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Reference:</strong> ${job.reference}</td></tr>` : ""}
            <tr><td style="padding:6px 0;font-size:14px;color:#1e293b;"><strong>Decision:</strong> ${details.label}</td></tr>
            <tr><td style="padding:6px 0;font-size:18px;color:${details.color};font-weight:700;">${currency} ${total.toFixed(2)}</td></tr>
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

    if (event?.type !== "update") return Response.json({ skipped: "not an update event" });

    if (payload_too_large && event?.entity_id) {
      data = await base44.asServiceRole.entities.Quote.get(event.entity_id);
    }
    if (!data) return Response.json({ skipped: "no quote data" });

    const details = decisionDetails(data.approval_status, data.status);
    if (!details) return Response.json({ skipped: "quote not approved or rejected" });

    const previousDecision = old_data?.approval_status || old_data?.status;
    if (previousDecision === details.label) return Response.json({ skipped: "decision unchanged" });

    const job = data.job_id ? await base44.asServiceRole.entities.Job.get(data.job_id).catch(() => null) : null;
    const recipients = await getStaffRecipients(base44);
    if (recipients.length === 0) return Response.json({ skipped: "no staff recipients" });

    const reference = job?.reference ? ` (${job.reference})` : "";
    const html = staffQuoteDecisionHtml(details, data, job);

    let first = true;
    for (const to of recipients) {
      if (!first) await sleep(600);
      first = false;
      await sendMail({
        to,
        subject: `${details.subject}${reference}`,
        body: html,
        from_name: BUSINESS.name,
      });
    }

    console.log(`[quoteDecisionNotify] Quote ${details.label} notification sent to ${recipients.join(", ")}`);
    return Response.json({ sent: true, decision: details.label, recipients });
  } catch (error) {
    console.error("[quoteDecisionNotify] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});