import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date().toISOString();
    const due = await base44.asServiceRole.entities.BlogPost.filter({ status: "scheduled" }, "scheduled_at", 200);
    const published = [];
    for (const post of due) {
      if (!post.scheduled_at || new Date(post.scheduled_at) > new Date()) continue;
      if (!post.title || !post.slug || !post.content_markdown) {
        await base44.asServiceRole.entities.BlogLog.create({ user_id: post.user_id, event_type: "publishing_failed", related_post_id: post.id, status: "failed", message: "Scheduled post is missing title, slug or content", created_at: now });
        continue;
      }
      const updated = await base44.asServiceRole.entities.BlogPost.update(post.id, { status: "published", published_at: post.published_at || now, updated_at: now });
      await base44.asServiceRole.entities.BlogLog.create({ user_id: post.user_id, event_type: "post_published", related_post_id: post.id, status: "success", message: `Published scheduled post: ${post.title}`, created_at: now });
      published.push(updated.id);
    }
    return Response.json({ published_count: published.length, published });
  } catch (error) {
    console.error("[processScheduledBlogPosts]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});