import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Builds a unified, real history timeline for one customer by pulling from
// existing records only — Jobs, Invoices, Feedback, AuditEvents, CustomerNotes.
// No fabricated history. Admin-only.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { customer_id } = await req.json();
    if (!customer_id) return Response.json({ error: 'customer_id is required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    // .get() throws ("Object not found") on a missing/invalid id rather than
    // returning null — treat that as a clean 404 instead of a generic 500.
    let customer;
    try {
      customer = await svc.Customer.get(customer_id);
    } catch (lookupErr) {
      if (String(lookupErr?.message || "").toLowerCase().includes("not found")) customer = null;
      else throw lookupErr;
    }
    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

    const email = (customer.email || "").toLowerCase();

    // Pull linked records. Jobs link by customer_id or customer_email.
    const [jobsById, jobsByEmail, notes, feedback, audits] = await Promise.all([
      svc.Job.filter({ customer_id }, "-created_date", 200).catch(() => []),
      email ? svc.Job.filter({ customer_email: customer.email }, "-created_date", 200).catch(() => []) : [],
      svc.CustomerNote.filter({ customer_id }, "-created_date", 200).catch(() => []),
      email ? svc.Feedback.filter({ submitted_by_email: customer.email }, "-created_date", 100).catch(() => []) : [],
      svc.AuditEvent.filter({ event_type: "customer_update", metadata: { customer_id } }, "-created_date", 200).catch(() => []),
    ]);

    // Merge + dedupe jobs
    const jobMap = {};
    [...jobsById, ...jobsByEmail].forEach((j) => { jobMap[j.id] = j; });
    const jobs = Object.values(jobMap);

    // Invoices linked to those jobs
    const jobIds = jobs.map((j) => j.id);
    let invoices = [];
    for (const jid of jobIds) {
      const inv = await svc.Invoice.filter({ job_id: jid }, "-created_date", 20).catch(() => []);
      invoices.push(...inv.map((i) => ({ ...i, _job: jobs.find((j) => j.id === jid) })));
    }

    // Customer-scoped audit (status / tag / profile changes)
    const customerAudits = (audits || []).filter((a) => a.metadata?.customer_id === customer_id);

    // Build a normalised timeline
    const events = [];
    const push = (e) => { if (e.date) events.push(e); };

    push({ kind: "signup", icon: "UserPlus", title: "Account created", date: customer.created_date, meta: customer.account_type });

    jobs.forEach((j) => push({
      kind: "job", icon: "Wrench",
      title: `${j.job_type || "Service"} — ${j.issue_description || j.reference || "Job"}`,
      subtitle: `Status: ${(j.status || "").replace(/_/g, " ")}`,
      date: j.created_date, link: `/dashboard/jobs?id=${j.id}`,
    }));

    invoices.forEach((i) => push({
      kind: "invoice", icon: "Receipt",
      title: `Invoice ${i.number || ""} — ${i.currency || "AUD"} ${Number(i.amount || 0).toFixed(2)}`,
      subtitle: `Status: ${i.status || "outstanding"}`,
      date: i.paid_date || i.created_date,
    }));

    feedback.forEach((f) => push({
      kind: "feedback", icon: "MessageSquare",
      title: `Feedback: ${f.subject}`,
      subtitle: `${f.feedback_type} · ${f.status}`,
      date: f.created_date,
    }));

    notes.forEach((n) => push({
      kind: "note", icon: "StickyNote",
      title: "Internal note",
      subtitle: n.body,
      author: n.author_name,
      date: n.created_date,
    }));

    customerAudits.forEach((a) => push({
      kind: "audit", icon: "RefreshCw",
      title: a.summary || "Account updated",
      author: a.actor_name,
      date: a.created_date,
    }));

    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return Response.json({
      customer,
      counts: { jobs: jobs.length, invoices: invoices.length, feedback: feedback.length, notes: notes.length },
      linked: {
        jobs: jobs.map((j) => ({ id: j.id, reference: j.reference, status: j.status, issue: j.issue_description, type: j.job_type, date: j.created_date })),
        invoices: invoices.map((i) => ({ id: i.id, number: i.number, amount: i.amount, currency: i.currency, status: i.status, date: i.paid_date || i.created_date })),
        feedback: feedback.map((f) => ({ id: f.id, subject: f.subject, type: f.feedback_type, status: f.status, date: f.created_date })),
      },
      timeline: events,
    });
  } catch (error) {
    console.error('[customerHistory] failed:', error?.message, error?.stack);
    return Response.json({ error: 'Failed to load customer history.' }, { status: 500 });
  }
});