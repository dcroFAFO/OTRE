import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BUSINESS = { name: "On The Run Electrics", accent: "#16b8a6", dark: "#16223f" };

function statusLabel(key) {
  if (!key) return "—";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function jobRow(job) {
  const ref = job.reference ? `<span style="color:#94a3b8;font-size:12px;">${job.reference}</span> ` : "";
  const asset = job.asset_label || job.scooter_label || "";
  const time = job.preferred_time_window ? ` · ${job.preferred_time_window}` : "";
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:600;color:#16223f;">${ref}${job.customer_name || "Customer"}</div>
        <div style="color:#64748b;font-size:13px;">${asset}${time}</div>
        ${job.issue_description ? `<div style="color:#475569;font-size:13px;margin-top:2px;">${job.issue_description}</div>` : ""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">
        <span style="background:#f1f5f9;color:#16223f;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;">${statusLabel(job.status)}</span>
      </td>
    </tr>`;
}

function buildEmail(name, jobs, todayLabel) {
  const rows = jobs.map(jobRow).join("");
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:${BUSINESS.dark};padding:22px 24px;">
        <div style="color:#fff;font-size:18px;font-weight:700;">${BUSINESS.name}</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:2px;">Your jobs for ${todayLabel}</div>
      </div>
      <div style="padding:24px;">
        <p style="color:#16223f;font-size:15px;margin:0 0 16px;">Hi ${name}, you have <strong>${jobs.length}</strong> job${jobs.length === 1 ? "" : "s"} on your plate today.</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          ${rows}
        </table>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
        Automated daily digest · ${BUSINESS.name}
      </div>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation (service context) — verify caller is admin if a user token is present.
    const isAuthed = await base44.auth.isAuthenticated().catch(() => false);
    if (isAuthed) {
      const user = await base44.auth.me();
      if (user?.role !== "admin") {
        return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const todayLabel = today.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });

    // Active technicians with an email
    const staff = await base44.asServiceRole.entities.StaffProfile.filter({ active: true });
    const techs = staff.filter((s) => s.email && s.user_id);

    // All non-archived jobs scheduled for today
    const jobs = await base44.asServiceRole.entities.Job.filter({ archived: false, scheduled_date: todayStr });

    const results = [];
    for (const tech of techs) {
      const theirJobs = jobs.filter((j) => j.assigned_technician_id === tech.user_id);
      if (theirJobs.length === 0) continue;

      const name = (tech.short_name || tech.full_name || "there").split(" ")[0];
      const html = buildEmail(name, theirJobs, todayLabel);

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: BUSINESS.name,
        to: tech.email,
        subject: `Your ${theirJobs.length} job${theirJobs.length === 1 ? "" : "s"} for ${todayLabel}`,
        body: html,
      });
      results.push({ tech: tech.email, jobs: theirJobs.length });
    }

    return Response.json({ sent: results.length, date: todayStr, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});