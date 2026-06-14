import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STAFF_ROLES = ['admin', 'employee', 'technician'];
const LABOUR_RATE = 80;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!STAFF_ROLES.includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return Response.json({ error: 'jobId is required' }, { status: 400 });
    }

    // .get() throws on a missing/invalid id — treat as a clean 404.
    let job;
    try {
      job = await base44.entities.Job.get(jobId);
    } catch (lookupErr) {
      if (String(lookupErr?.message || '').toLowerCase().includes('not found')) job = null;
      else throw lookupErr;
    }
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    const asset = job.asset_label || job.scooter_label || 'unknown electric scooter';
    const service = job.service_category_key || job.job_type || 'general repair';
    const issue = (job.issue_description || '').slice(0, 2000);
    const intake = job.intake || {};
    const privateNotes = (job.private_notes || '').slice(0, 2000);

    const intakeLines = [
      intake.make && `Make: ${intake.make}`,
      intake.model && `Model: ${intake.model}`,
      intake.battery_condition && `Battery condition: ${intake.battery_condition}`,
      intake.battery_voltage && `Battery voltage: ${intake.battery_voltage}`,
      intake.physical_condition && `Physical condition: ${intake.physical_condition}`,
      typeof intake.powers_on === 'boolean' && `Powers on: ${intake.powers_on ? 'yes' : 'no'}`,
      intake.initial_issue_notes && `Technician initial notes: ${intake.initial_issue_notes}`,
    ].filter(Boolean).join('\n');

    const prompt = `You are an experienced electric scooter repair technician drafting a quote for a workshop.
Produce a clear, professional DRAFT quote a human technician will review and edit before sending.

JOB CONTEXT
Scooter (make/model): ${asset}
Service type: ${service}
Reported issue: ${issue || '(none provided)'}
${intakeLines ? `\nIntake details:\n${intakeLines}` : ''}
${privateNotes ? `\nInternal technician notes:\n${privateNotes}` : ''}

INSTRUCTIONS
- Write a concise "diagnosis_notes" paragraph: the likely fault(s) based on the context above. If context is thin, state reasonable assumptions plainly rather than inventing specifics.
- Write a concise "recommended_repair" paragraph: the work you'd carry out to fix it.
- Estimate "labour_hours": realistic hands-on time in hours (decimals allowed, e.g. 1.5). Labour is billed at $${LABOUR_RATE}/hr.
- Do NOT include parts pricing — parts are sourced separately. Focus on diagnosis, repair plan, and labour time only.
- Keep language plain, customer-friendly, and free of guarantees about exact final price.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          diagnosis_notes: { type: 'string' },
          recommended_repair: { type: 'string' },
          labour_hours: { type: 'number' },
        },
        required: ['diagnosis_notes', 'recommended_repair', 'labour_hours'],
      },
    });

    const draft = {
      diagnosis_notes: (result?.diagnosis_notes || '').trim(),
      recommended_repair: (result?.recommended_repair || '').trim(),
      labour_hours: Math.max(0, Number(result?.labour_hours) || 0),
    };

    if (!draft.diagnosis_notes && !draft.recommended_repair) {
      return Response.json({ error: 'The AI did not return a usable draft. Please try again.' }, { status: 502 });
    }

    return Response.json({ draft });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});