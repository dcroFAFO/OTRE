import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Scheduled: flags jobs with no activity for 7+ days and emails admin + assigned techs.
// "Activity" = the most recent of the job's updated_date or its latest AuditEvent.

const BUSINESS = { name: "On The Run Electrics", dark: "#16223f", footer: "On The Run Electrics · hello@ontherunelectrics.com.au" };
const STALE_DAYS = 7;

async function sendMail({ to, subject, body, from_name }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const recipients = String(to).split(",").map((e) => e.trim()).filter(Boolean);
  const from = `${from_name || "On The Run Electrics"} <hello@ontherunelectrics.com.au>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: recipients, subject, html: body }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${await res.text()}`);
  return res.json();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Statuses that are finished — we don't chase these.
const TERMINAL = new Set(["completed", "cancelled", "ready_for_pickup", "closed"]);

const fmtDate = (d) => new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
const statusLabel = (k) => String(k || "—").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function jobRow(job, lastActivity, days) {
  const asset = job.asset_label || job.scooter_label || "";
  const ref = job.reference ? `<span style="color:#94a3b8;font-size:12px;">${job.reference}</span> ` : "";
  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:600;color:#16223f;">${ref}${job.customer_name || "Customer"}</div>
        <div style="color:#64748b;font-size:13px;">${asset}</div>
        <div style="color:#b45309;font-size:12px;margin-top:2px;">No activity for ${days} days · last ${fmtDate(lastActivity)}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap;">
        <span style="background:#f1f5f9;color:#16223f;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;">${statusLabel(job.status)}</span>
      </td>
    </tr>`;
}

function buildEmail(name, rows, count) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:${BUSINESS.dark};padding:22px 24px;">
        <div style="color:#fff;font-size:18px;font-weight:700;">${BUSINESS.name}</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:2px;">Stale jobs needing attention</div>
      </div>
      <div style="padding:24px;">
        <p style="color:#16223f;font-size:15px;margin:0 0 16px;">Hi ${name}, there ${count === 1 ? "is" : "are"} <strong>${count}</strong> job${count === 1 ? "" : "s"} with no activity in the last ${STALE_DAYS} days.</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">${rows}</table>
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">Automated weekly reminder · ${BUSINESS.footer}</div>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (service) context; if a user token is present, require admin.
    const isAuthed = await base44.auth.isAuthenticated().catch(() => false);
    if (isAuthed) {
      const user = await base44.auth.me();
      if (user?.role !== "admin") return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
    const jobs = await base44.asServiceRole.entities.Job.filter({ archived: false });
    const openJobs = jobs.filter((j) => !TERMINAL.has(j.status));

    const stale = [];
    for (const job of openJobs) {
      const lastAudit = await base44.asServiceRole.entities.AuditEvent
        .filter({ job_id: job.id }, "-created_date", 1).catch(() => []);
      const lastActivity = lastAudit[0]?.created_date || job.updated_date || job.created_date;
      if (lastActivity && new Date(lastActivity).getTime() < cutoff) {
        const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000));
        stale.push({ job, lastActivity, days });
      }
    }

    if (stale.length === 0) return Response.json({ sent: 0, stale: 0, note: "no stale jobs" });

    // Build recipient -> jobs map. Admin inbox gets ALL stale jobs; each tech gets their own.
    const settingsRows = await base44.asServiceRole.entities.NotificationSetting.list("-created_date", 1);
    const settings = settingsRows[0] || null;

    const recipientJobs = new Map(); // email -> { name, items: [] }
    const addFor = (email, name, item) => {
      if (!email) return;
      if (!recipientJobs.has(email)) recipientJobs.set(email, { name: name || "team", items: [] });
      recipientJobs.get(email).items.push(item);
    };

    const adminInbox = (settings?.admin_inbox || "").split(",").map((e) => e.trim()).filter(Boolean);
    for (const email of adminInbox) {
      for (const item of stale) addFor(email, "team", item);
    }

    // Cache staff lookups
    const staffCache = new Map();
    for (const item of stale) {
      const techId = item.job.assigned_technician_id;
      if (!techId) continue;
      if (!staffCache.has(techId)) {
        staffCache.set(techId, await base44.asServiceRole.entities.StaffProfile.get(techId).catch(() => null));
      }
      const staff = staffCache.get(techId);
      if (staff?.email) addFor(staff.email, (staff.short_name || staff.full_name || "there").split(" ")[0], item);
    }

    const results = [];
    let first = true;
    for (const [email, { name, items }] of recipientJobs) {
      const rows = items.map((i) => jobRow(i.job, i.lastActivity, i.days)).join("");
      if (!first) await sleep(600);
      first = false;
      await sendMail({
        from_name: BUSINESS.name,
        to: email,
        subject: `${items.length} stale job${items.length === 1 ? "" : "s"} need attention`,
        body: buildEmail(name, rows, items.length),
      });
      results.push({ to: email, jobs: items.length });
    }

    return Response.json({ sent: results.length, stale: stale.length, results });
  } catch (error) {
    console.error("[staleJobReminder] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});