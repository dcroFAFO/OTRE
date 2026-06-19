import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 0));
    const jobId = String(body.job_id || "").trim();
    const message = String(body.message || "").trim();

    if (!jobId) {
      return Response.json({ ok: false, error: "Job reference is missing." });
    }
    if (!rating) {
      return Response.json({ ok: false, error: "Please choose a star rating." });
    }

    const job = await base44.asServiceRole.entities.Job.get(jobId).catch(() => null);
    if (!job) {
      return Response.json({ ok: false, error: "We couldn't find that job." });
    }

    const record = await base44.asServiceRole.entities.Feedback.create({
      subject: `${rating}-star customer rating${job.reference ? ` — ${job.reference}` : ""}`,
      feedback_type: "Customer Rating",
      message: message || `${rating} star rating submitted by customer.`,
      rating,
      job_id: job.id,
      customer_id: job.customer_id || "",
      priority: rating <= 2 ? "High" : "Medium",
      status: "New",
      submitted_by_name: job.customer_name || "Customer",
      submitted_by_email: job.customer_email || "",
      page_context: String(body.page_context || "").slice(0, 500),
      device_context: String(body.device_context || "").slice(0, 200),
      app_context: String(body.app_context || "").slice(0, 500),
      is_archived: false,
      upvotes: 0,
      tags: ["customer-rating", `rating-${rating}`],
    });

    return Response.json({ ok: true, id: record.id });
  } catch (error) {
    console.error("[submitCustomerFeedback] Error:", error.message);
    return Response.json({ error: "Something went wrong sending your feedback. Please try again." }, { status: 500 });
  }
});