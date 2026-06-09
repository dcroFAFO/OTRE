import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// All quote business logic (totals, status transitions, job sync, audit) runs server-side.

const CURRENCY = "AUD";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, jobId, ...params } = await req.json();
    if (!action || !jobId) return Response.json({ error: "action and jobId are required" }, { status: 400 });

    const jobs = await base44.entities.Job.filter({ id: jobId }, "", 1);
    const job = jobs[0];
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

    const logAudit = ({ eventType, newValue = null, summary = "", visibility = "internal" }) =>
      base44.entities.AuditEvent.create({
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
      const quotes = await base44.entities.Quote.filter({ job_id: job.id }, "-created_date", 1);
      return quotes[0] || null;
    };

    let result;

    switch (action) {
      case "save": {
        const data = params.data || {};
        const total = (Number(data.labour_estimate) || 0) + (Number(data.parts_estimate) || 0);
        if (data.id) {
          result = await base44.entities.Quote.update(data.id, { ...data, total });
        } else {
          result = await base44.entities.Quote.create({ ...data, job_id: job.id, total, currency: CURRENCY, status: "draft" });
          await base44.entities.Job.update(job.id, { quote_status: "draft" });
          await logAudit({ eventType: "quote_generated", summary: "Quote generated", newValue: `${CURRENCY} ${total}` });
        }
        break;
      }
      case "send": {
        result = await base44.entities.Quote.update(params.quoteId, { status: "sent", sent_date: new Date().toISOString() });
        await base44.entities.Job.update(job.id, { quote_status: "sent", status: "quote_sent" });
        await logAudit({ eventType: "quote_sent", summary: "Quote sent to customer", visibility: "customer" });
        break;
      }
      case "set_approval": {
        const approved = !!params.approved;
        result = await base44.entities.Quote.update(params.quoteId, {
          status: approved ? "approved" : "rejected",
          approval_status: approved ? "approved" : "rejected",
        });
        await base44.entities.Job.update(job.id, {
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
          quote = await base44.entities.Quote.create({
            job_id: job.id, currency: CURRENCY, status: "draft",
            labour_estimate: 0, parts_estimate: 0, total: 0,
          });
          await base44.entities.Job.update(job.id, { quote_status: "draft" });
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

        result = await base44.entities.Quote.update(quote.id, { line_items, parts_estimate, total });
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});