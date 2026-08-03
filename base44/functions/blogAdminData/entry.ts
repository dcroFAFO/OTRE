import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const isStaff = (user) => ["admin", "employee", "technician"].includes(user?.role) || user?.data?.is_customer === false;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !isStaff(user)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "dashboard";
    const [posts, categories, tags, settingsList, logs] = await Promise.all([
      base44.asServiceRole.entities.BlogPost.filter({ user_id: user.id }, "-updated_at", 500),
      base44.asServiceRole.entities.BlogCategory.filter({ user_id: user.id }, "name", 200),
      base44.asServiceRole.entities.BlogTag.filter({ user_id: user.id }, "name", 200),
      base44.asServiceRole.entities.BlogSettings.filter({ user_id: user.id }, "-created_date", 1),
      action === "logs" ? base44.asServiceRole.entities.BlogLog.filter({ user_id: user.id }, "-created_at", 500) : Promise.resolve([])
    ]);
    return Response.json({ posts, categories, tags, settings: settingsList[0] || null, logs });
  } catch (error) {
    console.error("[blogAdminData]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});