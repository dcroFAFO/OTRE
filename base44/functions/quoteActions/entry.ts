import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// All quote business logic (totals, status transitions, job sync, audit) runs server-side.

const CURRENCY = "AUD";
const LABOUR_RATE = 80; // $/hour
const MIN_HOURS = 1;

// Labour cost derived from time-to-complete: $80/hr, minimum 1 hour.
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

    // Service-role client for DB writes. Authorization is enforced in code
    // below; entity RLS restricts direct SDK writes to staff, so the legitimate
    // customer quote-approval path must write through the service role.
    const db = base44.asServiceRole.entities;

    // A missing/invalid id makes the SDK throw ("Object not found") rather than
    // return []. Treat that as a clean 404 instead of a generic 500.
    let job;
    try {
      const jobs = await db.Job.filter({ id: jobId }, "", 1);
      job = jobs[0];
    } catch (lookupErr) {
      if (String(lookupErr?.message || "").toLowerCase().includes("not found")) job = null;
      else throw lookupErr;
    }
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    // Authorization: staff can do everything. A customer may ONLY set quote
    // approval, and only on a job that belongs to them (by email).
    const STAFF_ROLES = ["admin", "employee", "technician"];
    const isStaffUser = STAFF_ROLES.includes(user.role);
    if (!isStaffUser) {
      const ownsJob = job.customer_email && user.email &&
        job.customer_email.toLowerCase() === user.email.toLowerCase();
      if (!ownsJob || action !== "set_approval") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const logAudit = ({ eventType, newValue = null, summary = "", visibility = "internal" }) =>
      db.AuditEvent.create({
        event_type: eventType,
        job_id: job.id,
        actor_id: user.id,
        actor_name: user.full_name || "System",
        actor_role: user.role || "system",
        new_value: newValue != null ? String(newValue) : null,
        summary,
        visibility,
      });

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
          result = await db.Quote.create({ ...data, job_id: job.id, customer_email: job.customer_email || null, total, currency: CURRENCY, status: "draft" });
          await db.Job.update(job.id, { quote_status: "draft" });
          await logAudit({ eventType: "quote_generated", summary: "Quote generated", newValue: `${CURRENCY} ${total}` });
        }
        break;
      }
      case "send": {
        result = await db.Quote.update(params.quoteId, { status: "sent", sent_date: new Date().toISOString() });
        await db.Job.update(job.id, { quote_status: "sent", status: "quote_sent" });
        await logAudit({ eventType: "quote_sent", summary: "Quote sent to customer", visibility: "customer" });
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
          status: approved ? "quote_approved" : job.status,
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
            job_id: job.id, customer_email: job.customer_email || null, currency: CURRENCY, status: "draft",
            labour_estimate: 0, parts_estimate: 0, total: 0,
          });
          await db.Job.update(job.id, { quote_status: "draft" });
        }

        const newItems = parts.map((p) => ({
          description: p.retailer ? `${p.name} (${p.retailer})` : p.name,
          qty: Number(p.qty) || 1,
          unit_price: Number(p.typical_price) || 0,
          kind: "part",
        }));

        const line_items = [...(quote.line_items || []), ...newItems];
        const parts_estimate = line_items
          .filter((li) => li.kind === "part")
          .reduce((s, li) => s + (Number(li.unit_price) || 0) * (Number(li.qty) || 1), 0);
        const total = (Number(quote.labour_estimate) || 0) + parts_estimate;

        result = await db.Quote.update(quote.id, { line_items, parts_estimate, total });
        await logAudit({
          eventType: "quote_generated",
          summary: `Added ${parts.length} sourced part(s) to quote`,
          newValue: `${CURRENCY} ${total.toFixed(2)}`,
        });
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