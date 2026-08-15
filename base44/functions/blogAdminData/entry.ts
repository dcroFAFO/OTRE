import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "dashboard";
    const [posts, categories, tags, settingsList, logs] = await Promise.all([
      // The blog is a single shared publication — every staff member sees the
      // same posts, taxonomy, settings and logs. Do NOT filter by user_id.
      base44.asServiceRole.entities.BlogPost.list("-updated_at", 500),
      base44.asServiceRole.entities.BlogCategory.list("name", 200),
      base44.asServiceRole.entities.BlogTag.list("name", 200),
      base44.asServiceRole.entities.BlogSettings.list("-created_date", 1),
      action === "logs" ? base44.asServiceRole.entities.BlogLog.list("-created_at", 500) : Promise.resolve([])
    ]);
    return Response.json({ posts, categories, tags, settings: settingsList[0] || null, logs });
  } catch (error) {
    console.error("[blogAdminData]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
