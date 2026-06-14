import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Fetches all non-archived jobs using service role so technicians can see
// jobs created by the public booking form (service role created_by).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const jobs = await base44.asServiceRole.entities.Job.filter({}, "-created_date", 500);
    const visible = jobs.filter((j) => !j.archived);

    return Response.json(visible);
  } catch (error) {
    console.error("[listJobs] error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});