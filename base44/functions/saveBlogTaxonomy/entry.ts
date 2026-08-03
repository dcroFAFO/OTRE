import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const slugify = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
const isStaff = (user) => ["admin", "employee", "technician"].includes(user?.role) || user?.data?.is_customer === false;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !isStaff(user)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { type, id, data = {} } = await req.json();
    const entityName = type === "tag" ? "BlogTag" : "BlogCategory";
    const now = new Date().toISOString();
    const slug = slugify(data.slug || data.name);
    if (!data.name || !slug) return Response.json({ error: "Name is required" }, { status: 400 });
    const existing = await base44.asServiceRole.entities[entityName].filter({ user_id: user.id, slug }, "", 5);
    if (existing.some((item) => item.id !== id)) return Response.json({ error: "This slug already exists" }, { status: 409 });
    const payload = { ...data, user_id: user.id, slug, updated_at: now, is_active: data.is_active !== false };
    const item = id ? await base44.asServiceRole.entities[entityName].update(id, payload) : await base44.asServiceRole.entities[entityName].create({ ...payload, created_at: now });
    await base44.asServiceRole.entities.BlogLog.create({ user_id: user.id, event_type: `${type || "category"}_saved`, status: "success", message: `Saved ${item.name}`, created_at: now });
    return Response.json({ item });
  } catch (error) {
    console.error("[saveBlogTaxonomy]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});