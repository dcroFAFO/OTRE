import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const payload = await req.json();
    const now = new Date().toISOString();
    // There is exactly ONE blog settings record for the whole site. It must be
    // shared, because publicBlog reads it without an owner filter.
    const existing = (await base44.asServiceRole.entities.BlogSettings.list("-created_date", 1))[0];
    const data = { ...payload, user_id: user.id, updated_at: now };
    const settings = existing ? await base44.asServiceRole.entities.BlogSettings.update(existing.id, data) : await base44.asServiceRole.entities.BlogSettings.create({ ...data, created_at: now });
    await base44.asServiceRole.entities.BlogLog.create({ user_id: user.id, event_type: "blog_settings_updated", status: "success", message: "Blog settings updated", created_at: now });
    return Response.json({ settings });
  } catch (error) {
    console.error("[saveBlogSettings]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
