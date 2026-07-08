import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const slugify = (value) => String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
const wordCount = (text) => String(text || "").trim().split(/\s+/).filter(Boolean).length;
const readingTime = (text) => Math.max(1, Math.ceil(wordCount(text) / 220));
const isStaff = (user) => ["admin", "employee", "technician"].includes(user?.role) || user?.data?.is_customer === false;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !isStaff(user)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await req.json();
    const title = String(payload.title || "Untitled post").trim();
    const slug = slugify(payload.slug || title);
    if (!slug) return Response.json({ error: "Slug is required" }, { status: 400 });
    const existing = await base44.asServiceRole.entities.BlogPost.filter({ user_id: user.id, slug }, "", 1);
    if (existing.length) return Response.json({ error: "A post with this slug already exists" }, { status: 409 });
    const now = new Date().toISOString();
    const content = payload.content_markdown || "";
    const post = await base44.asServiceRole.entities.BlogPost.create({
      ...payload,
      user_id: user.id,
      title,
      slug,
      status: payload.status || "draft",
      tag_ids: Array.isArray(payload.tag_ids) ? payload.tag_ids : [],
      word_count: wordCount(content),
      reading_time_minutes: readingTime(content),
      created_at: now,
      updated_at: now
    });
    await base44.asServiceRole.entities.BlogLog.create({ user_id: user.id, event_type: "post_created", related_post_id: post.id, status: "success", message: `Created ${title}`, created_at: now });
    return Response.json({ post });
  } catch (error) {
    console.error("[createBlogPost]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});