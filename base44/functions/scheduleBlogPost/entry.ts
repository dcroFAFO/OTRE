import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const isStaff = (user) => ["admin", "employee", "technician"].includes(user?.role) || user?.data?.is_customer === false;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !isStaff(user)) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { postId, scheduled_at } = await req.json();
    if (!scheduled_at) return Response.json({ error: "Scheduled date is required" }, { status: 400 });
    const post = await base44.asServiceRole.entities.BlogPost.get(postId);
    if (!post || post.user_id !== user.id) return Response.json({ error: "Post not found" }, { status: 404 });
    if (!post.title || !post.slug || !post.content_markdown) return Response.json({ error: "Title, slug and content are required before scheduling" }, { status: 400 });
    const now = new Date().toISOString();
    const updated = await base44.asServiceRole.entities.BlogPost.update(post.id, { status: "scheduled", scheduled_at, updated_at: now });
    await base44.asServiceRole.entities.BlogLog.create({ user_id: user.id, event_type: "post_scheduled", related_post_id: post.id, status: "success", message: `Scheduled ${post.title}`, created_at: now });
    return Response.json({ post: updated });
  } catch (error) {
    console.error("[scheduleBlogPost]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});