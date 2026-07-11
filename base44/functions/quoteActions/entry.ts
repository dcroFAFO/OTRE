import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  buildLabourLineItem,
  buildQuotePartItems,
  CURRENCY,
  normalizeLabourHours,
  prepareQuoteData,
  summarizeQuoteLineItems,
} from './domain.ts';

// All quote business logic (totals, status transitions, job sync, audit) runs server-side.

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
        const data = prepareQuoteData(params.data);
        const total = data.total;
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
        await logAudit({ eventType: "estimate_sent", summary: "Estimate made available to customer", visibility: "customer" });
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
        const parts = Array.isArray(params.parts) ? params.parts : [];
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

        const newItems = buildQuotePartItems(parts);
        const line_items = [...(quote.line_items || []), ...newItems];
        const { parts_estimate, labour_estimate, total } = summarizeQuoteLineItems(line_items);

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
        const hrs = normalizeLabourHours(hours);
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
        const newItem = buildLabourLineItem(hrs);
        const line_items = [...(quote.line_items || []), newItem];
        const totals = summarizeQuoteLineItems(line_items);
        result = await db.Quote.update(quote.id, { line_items, ...totals });
        await logAudit({ eventType: "quote_generated", summary: `Added labour: ${hrs}hr(s)`, newValue: `${CURRENCY} ${totals.total.toFixed(2)}` });
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
2. An estimated "labour_hours" (number, e.g. 1.5) for the repair.

Be professional, clear, and customer-friendly. Do not mention internal codes or jargon.`;

        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              diagnosis_notes: { type: "string" },
              labour_hours: { type: "number" },
            },
          },
        });

        result = {
          diagnosis_notes: aiResult.diagnosis_notes || "",
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
