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
    const { postId, data = {} } = await req.json();
    if (!postId) return Response.json({ error: "postId is required" }, { status: 400 });
    const current = await base44.asServiceRole.entities.BlogPost.get(postId);
    if (!current || current.user_id !== user.id) return Response.json({ error: "Post not found" }, { status: 404 });
    const nextSlug = data.slug ? slugify(data.slug) : current.slug;
    if (nextSlug !== current.slug) {
      const existing = await base44.asServiceRole.entities.BlogPost.filter({ user_id: user.id, slug: nextSlug }, "", 2);
      if (existing.some((post) => post.id !== postId)) return Response.json({ error: "A post with this slug already exists" }, { status: 409 });
    }
    const content = data.content_markdown ?? current.content_markdown ?? "";
    const updated = await base44.asServiceRole.entities.BlogPost.update(postId, {
      ...data,
      slug: nextSlug,
      word_count: wordCount(content),
      reading_time_minutes: readingTime(content),
      updated_at: new Date().toISOString()
    });
    await base44.asServiceRole.entities.BlogLog.create({ user_id: user.id, event_type: "post_updated", related_post_id: postId, status: "success", message: `Updated ${updated.title || current.title}`, created_at: new Date().toISOString() });
    return Response.json({ post: updated });
  } catch (error) {
    console.error("[updateBlogPost]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});