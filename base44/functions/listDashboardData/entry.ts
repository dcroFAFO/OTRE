import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STAFF_ROLES = ["admin", "employee", "technician"];

function effectiveRole(user) {
  const candidates = [user?.role, user?.data?.role, user?.data?._app_role].filter(Boolean);
  return candidates.find((role) => STAFF_ROLES.includes(role)) || candidates[0] || null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const role = effectiveRole(user);

    if (!user || !STAFF_ROLES.includes(role)) {
      return Response.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const type = body.type || "jobs";

    if (type === "staff") {
      const staff = await base44.asServiceRole.entities.StaffProfile.filter({ active: true }, "full_name", 100);
      return Response.json({ staff });
    }

    const filter = body.filter || {};
    const allJobs = await base44.asServiceRole.entities.Job.list("-created_date", 200);
    const jobs = allJobs.filter((job) => {
      if (job.archived === true) return false;
      return Object.entries(filter).every(([key, value]) => job[key] === value);
    });
    return Response.json({ jobs });
  } catch (error) {
    console.error("[listDashboardData] failed", error.message);
    return Response.json({ error: "Unable to load dashboard data" }, { status: 500 });
  }
});