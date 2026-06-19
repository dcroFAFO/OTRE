import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

async function getJobFromPayload(base44, payload) {
  const jobId = payload?.event?.entity_id;
  if (!jobId) return null;
  if (!payload.payload_too_large && payload.data) return payload.data;

  const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId }, '', 1);
  return jobs[0] || null;
}

async function jobIdExists(base44, jobId, currentRecordId) {
  const matches = await base44.asServiceRole.entities.Job.filter({ job_id: jobId }, '', 2);
  return matches.some((job) => job.id !== currentRecordId);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    if (payload?.event?.type !== 'create' || payload?.event?.entity_name !== 'Job') {
      return Response.json({ skipped: 'not a Job create event' });
    }

    const job = await getJobFromPayload(base44, payload);
    if (!job?.id) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.job_id && !(await jobIdExists(base44, job.job_id, job.id))) {
      return Response.json({ skipped: 'job_id already assigned', job_id: job.job_id });
    }

    const uniqueJobId = job.id;
    if (await jobIdExists(base44, uniqueJobId, job.id)) {
      return Response.json({ error: 'Could not assign a unique job_id' }, { status: 409 });
    }

    await base44.asServiceRole.entities.Job.update(job.id, { job_id: uniqueJobId });

    return Response.json({ assigned: true, job_id: uniqueJobId, record_id: job.id });
  } catch (error) {
    console.error('[assignJobIdToNewJob] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});