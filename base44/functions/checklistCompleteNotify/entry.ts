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

const isFull = (list) => Array.isArray(list) && list.length > 0 && list.every((c) => c.done);

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    let { data, old_data, event, payload_too_large } = body;

    if (event?.type !== "update") {
      return Response.json({ skipped: "not an update event" });
    }

    // Re-fetch if payload was omitted for size
    if (payload_too_large && event?.entity_id) {
      data = await base44.asServiceRole.entities.Job.get(event.entity_id);
    }
    if (!data) return Response.json({ skipped: "no job data" });

    const wasFull = isFull(old_data?.checklist);
    const nowFull = isFull(data?.checklist);

    // Only fire on the transition into a fully-complete checklist
    if (!nowFull || wasFull) {
      return Response.json({ skipped: "checklist not newly completed" });
    }

    const email = data.customer_email;
    if (!email) return Response.json({ skipped: "no customer email on job" });

    const customerName = data.customer_name || "Customer";
    const reference = data.reference ? ` (${data.reference})` : "";
    const assetLabel = data.asset_label || data.scooter_label || "your scooter";
    const checklist = data.checklist || [];

    const rows = checklist.map((c) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1e293b;">
          <span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:#16a34a;color:#fff;font-size:12px;margin-right:10px;">&#10003;</span>
          ${c.label}
        </td>
      </tr>`).join("");

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#16a34a;padding:28px 32px;">
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">OTR Scooters</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Repair Checklist Complete</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${customerName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">Our technician has finished every step on your repair checklist. Here's a summary of the work carried out on <strong>${assetLabel}</strong>.</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <tr><td style="padding:4px 0;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Scooter</span><br>
                <span style="font-size:15px;color:#1e293b;font-weight:500;">${assetLabel}</span>
              </td></tr>
              ${data.reference ? `<tr><td style="padding:8px 0 4px;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Job Reference</span><br>
                <span style="font-size:15px;color:#1e293b;font-weight:500;">${data.reference}</span>
              </td></tr>` : ""}
            </table>

            <p style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Completed Steps (${checklist.length})</p>
            <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>

            <p style="margin:24px 0 0;font-size:14px;color:#64748b;">Questions? Reply to this email or call us on <strong>(03) 9000 1234</strong>.</p>
          </td>
        </tr>
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

    await sendMail({
      to: email,
      subject: `Repair checklist completed${reference}`,
      body: htmlBody,
      from_name: "OTR Scooters",
    });

    console.log(`[checklistCompleteNotify] Summary sent to ${email}`);
    return Response.json({ sent: true, to: email, steps: checklist.length });

  } catch (error) {
    console.error("[checklistCompleteNotify] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});