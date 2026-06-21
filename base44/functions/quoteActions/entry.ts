import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// All quote business logic (totals, status transitions, job sync, audit) runs server-side.

const CURRENCY = "AUD";
const LABOUR_RATE = 80; // $/hour
const MIN_HOURS = 1;

async function sendQuoteEmail({ job, quote }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) { console.warn("[quoteActions] RESEND_API_KEY not set, skipping email"); return; }
  const email = job.customer_email;
  if (!email) { console.warn("[quoteActions] No customer email on job, skipping email"); return; }

  const customerName = job.customer_name || "Customer";
  const assetLabel = job.asset_label || "your scooter";
  const reference = job.reference ? ` (${job.reference})` : "";
  const total = Number(quote.total || 0).toFixed(2);
  const currency = quote.currency || CURRENCY;

  const lineItemsHtml = (quote.line_items || []).length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        ${(quote.line_items || []).map((li) => `
          <tr>
            <td style="font-size:14px;color:#475569;padding:4px 0;">${li.qty > 1 ? `${li.qty}× ` : ""}${li.description}</td>
            <td style="font-size:14px;color:#1e293b;font-weight:500;text-align:right;padding:4px 0;">${currency} ${((Number(li.unit_price) || 0) * (Number(li.qty) || 1)).toFixed(2)}</td>
          </tr>`).join("")}
        <tr style="border-top:1px solid #e2e8f0;">
          <td style="font-size:15px;color:#1e293b;font-weight:700;padding:10px 0 4px;">Total</td>
          <td style="font-size:15px;color:#0f766e;font-weight:700;text-align:right;padding:10px 0 4px;">${currency} ${total}</td>
        </tr>
      </table>`
    : `<p style="margin:0 0 8px;font-size:15px;color:#1e293b;font-weight:700;">Total: ${currency} ${total}</p>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0f766e;padding:28px 32px;">
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;">OTR Scooters</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:700;">Your Repair Estimate 🔧</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;color:#1e293b;">Hi ${customerName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
              We've assessed your scooter and prepared an estimate for the recommended repair. Please review the details below.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <tr><td style="padding:4px 0;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Scooter</span><br>
                <span style="font-size:15px;color:#1e293b;font-weight:500;">${assetLabel}</span>
              </td></tr>
              ${job.reference ? `<tr><td style="padding:8px 0 4px;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Job Reference</span><br>
                <span style="font-size:15px;color:#1e293b;font-weight:500;">${job.reference}</span>
              </td></tr>` : ""}
              ${quote.diagnosis_notes ? `<tr><td style="padding:8px 0 4px;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Diagnosis</span><br>
                <span style="font-size:14px;color:#475569;line-height:1.5;">${quote.diagnosis_notes}</span>
              </td></tr>` : ""}
              ${quote.recommended_repair ? `<tr><td style="padding:8px 0 4px;">
                <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;font-weight:600;">Recommended Repair</span><br>
                <span style="font-size:14px;color:#475569;line-height:1.5;">${quote.recommended_repair}</span>
              </td></tr>` : ""}
            </table>

            <p style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#64748b;">Estimate Breakdown</p>
            ${lineItemsHtml}

            <p style="margin:24px 0 0;font-size:14px;color:#64748b;">
              If you have any questions about this estimate, please reply to this email or call us on <strong>(03) 9000 1234</strong>.
            </p>
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "OTR Scooters <hello@ontherunelectrics.com.au>",
      to: [email],
      subject: `Your repair estimate is ready${reference}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
  console.log(`[quoteActions] Quote email sent to ${email}`);
}

const labourFromHours = (hours) => Math.max(MIN_HOURS, Number(hours) || 0) * LABOUR_RATE;

Deno.serve(async (req) => {
  // requestMeta is filled in as parsing progresses so the catch block can log
  // a useful summary (who, which action, which record) when something fails.
  const requestMeta = { fn: "quoteActions" };
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    requestMeta.userId = user.id;

    const { action, jobId, ...params } = await req.json();
    requestMeta.action = action;
    requestMeta.jobId = jobId;
    if (!action || !jobId) return Response.json({ error: "action and jobId are required" }, { status: 400 });

    let job = null;
    try {
      job = await base44.asServiceRole.entities.Job.get(jobId);
    } catch {
      const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId }, "", 1);
      job = jobs[0] || null;
    }
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    const logAudit = async ({ eventType, newValue = null, summary = "", visibility = "internal" }) => {
      try {
        await base44.asServiceRole.entities.AuditEvent.create({
          event_type: eventType,
          job_id: job.id,
          customer_id: job.customer_id || null,
          actor_id: user.id,
          actor_name: user.full_name || "System",
          actor_role: user.role || "system",
          new_value: newValue != null ? String(newValue) : null,
          summary,
          visibility,
        });
      } catch (auditError) {
        console.warn("[quoteActions] audit log skipped:", auditError.message);
      }
    };

    // Quote writes run as the signed-in user so Quote RLS can validate staff/customer access.
    const db = base44.entities;

    const getJobQuote = async () => {
      const quotes = await db.Quote.filter({ job_id: job.id }, "-created_date", 1);
      return quotes[0] || null;
    };

    let result;

    switch (action) {
      case "save": {
        const data = params.data || {};
        // When labour_hours is supplied, labour cost is computed from it.
        if (data.labour_hours != null && data.labour_hours !== "") {
          data.labour_estimate = labourFromHours(data.labour_hours);
        }
        const total = (Number(data.labour_estimate) || 0) + (Number(data.parts_estimate) || 0);
        if (data.id) {
          result = await db.Quote.update(data.id, { ...data, total });
        } else {
          result = await db.Quote.create({ ...data, job_id: job.id, customer_id: job.customer_id || data.customer_id || null, total, currency: CURRENCY, status: "draft" });
          await db.Job.update(job.id, { quote_status: "draft" });
          await logAudit({ eventType: "quote_generated", summary: "Quote generated", newValue: `${CURRENCY} ${total}` });
        }
        break;
      }
      case "send": {
        result = await db.Quote.update(params.quoteId, { status: "sent", sent_date: new Date().toISOString() });
        await db.Job.update(job.id, { quote_status: "sent" });
        await logAudit({ eventType: "estimate_sent", summary: "Estimate sent to customer", visibility: "customer" });
        await sendQuoteEmail({ job, quote: result });
        break;
      }
      case "set_approval": {
        const approved = !!params.approved;
        result = await db.Quote.update(params.quoteId, {
          status: approved ? "approved" : "rejected",
          approval_status: approved ? "approved" : "rejected",
        });
        await db.Job.update(job.id, {
          quote_status: approved ? "approved" : "rejected",
        });
        await logAudit({
          eventType: approved ? "quote_approved" : "quote_rejected",
          summary: approved ? "Quote approved" : "Quote rejected",
          visibility: "customer",
        });
        break;
      }
      case "add_parts": {
        const parts = params.parts || [];
        let quote = await getJobQuote();
        if (!quote) {
          quote = await db.Quote.create({
            job_id: job.id,
            customer_id: job.customer_id || null,
            currency: CURRENCY,
            status: "draft",
            labour_estimate: 0,
            parts_estimate: 0,
            total: 0,
          });
          await db.Job.update(job.id, { quote_status: "draft" });
        }

        const newItems = parts.map((p) => ({
          description: p.retailer ? `${p.name} (${p.retailer})` : p.name,
          qty: Number(p.qty) || 1,
          unit_price: Number(p.typical_price) || 0,
          kind: "part",
          sku: p.sku || p.product_sku || p.product_code || "",
        }));

        const line_items = [...(quote.line_items || []), ...newItems];
        const parts_estimate = line_items
          .filter((li) => li.kind === "part")
          .reduce((s, li) => s + (Number(li.unit_price) || 0) * (Number(li.qty) || 1), 0);
        const labour_estimate = line_items
          .filter((li) => li.kind === "labour")
          .reduce((s, li) => s + (Number(li.unit_price) || 0) * (Number(li.qty) || 1), 0);
        const total = labour_estimate + parts_estimate;

        result = await db.Quote.update(quote.id, { line_items, parts_estimate, labour_estimate, total });
        await logAudit({
          eventType: "quote_generated",
          summary: `Added ${parts.length} sourced part(s) to estimate`,
          newValue: `${CURRENCY} ${total.toFixed(2)}`,
        });
        break;
      }
      case "add_labour": {
        const { hours } = params;
        const hrs = Math.max(0.25, Number(hours) || 1);
        const unit_price = labourFromHours(hrs) / hrs; // = LABOUR_RATE
        let quote = await getJobQuote();
        if (!quote) {
          quote = await db.Quote.create({
            job_id: job.id,
            customer_id: job.customer_id || null,
            currency: CURRENCY,
            status: "draft",
            labour_estimate: 0,
            parts_estimate: 0,
            total: 0,
          });
          await db.Job.update(job.id, { quote_status: "draft" });
        }
        const newItem = { description: `Labour (${hrs}hr${hrs !== 1 ? "s" : ""} @ $${LABOUR_RATE}/hr)`, qty: 1, unit_price: hrs * LABOUR_RATE, kind: "labour" };
        const line_items = [...(quote.line_items || []), newItem];
        const labour_estimate = line_items
          .filter((li) => li.kind === "labour")
          .reduce((s, li) => s + (Number(li.unit_price) || 0) * (Number(li.qty) || 1), 0);
        const total = labour_estimate + (Number(quote.parts_estimate) || 0);
        result = await db.Quote.update(quote.id, { line_items, labour_estimate, total });
        await logAudit({ eventType: "quote_generated", summary: `Added labour: ${hrs}hr(s)`, newValue: `${CURRENCY} ${total.toFixed(2)}` });
        break;
      }
      case "ai_draft": {
        // Build a rich prompt from all available job context
        const intake = job.intake || {};
        const scooterDesc = [intake.make, intake.model, intake.serial_number].filter(Boolean).join(" ") || job.asset_label || "scooter";
        const batteryInfo = intake.battery_condition ? `Battery: ${intake.battery_condition}${intake.battery_voltage ? ` (${intake.battery_voltage}V)` : ""}` : "";
        const odometer = intake.odometer_km != null ? `Odometer: ${intake.odometer_km} km` : "";
        const physicalCond = intake.physical_condition ? `Physical condition: ${intake.physical_condition}` : "";
        const powersOn = intake.powers_on != null ? `Powers on: ${intake.powers_on ? "yes" : "no"}` : "";
        const initialNotes = intake.initial_issue_notes || job.issue_description || "";
        const contextLines = [scooterDesc, batteryInfo, odometer, physicalCond, powersOn, initialNotes ? `Issue: ${initialNotes}` : ""].filter(Boolean).join("\n");

        const prompt = `You are a scooter repair technician writing a customer-facing repair estimate.

Job context:
${contextLines}

Based on the above, write:
1. A concise "diagnosis_notes" (1-3 sentences) explaining what the technician found.
2. A brief "recommended_repair" (1 sentence) describing the recommended fix.
3. An estimated "labour_hours" (number, e.g. 1.5) for the repair.

Be professional, clear, and customer-friendly. Do not mention internal codes or jargon.`;

        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              diagnosis_notes: { type: "string" },
              recommended_repair: { type: "string" },
              labour_hours: { type: "number" },
            },
          },
        });

        result = {
          diagnosis_notes: aiResult.diagnosis_notes || "",
          recommended_repair: aiResult.recommended_repair || "",
          labour_hours: aiResult.labour_hours || 1,
        };
        break;
      }
      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    // Structured server-side error log — inspect in dashboard → Code → Functions → logs.
    console.error("[quoteActions] request failed", JSON.stringify({ ...requestMeta, message: error.message, stack: error.stack }));
    // Safe, friendly message — internal details stay in the server logs.
    return Response.json({ error: "Something went wrong while updating the quote. Please try again." }, { status: 500 });
  }
});