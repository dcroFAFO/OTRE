import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveInlineImages, generateBlogImage } from '../../shared/blogImages.ts';

// Repairs an existing post whose markdown still contains unresolved
// ![alt](image:PROMPT) placeholders, and optionally generates a featured image.
// New posts are handled inline by generateBlogPost.

const isStaff = (user) => ["admin", "employee", "technician"].includes(user?.role);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !isStaff(user)) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { postId, featured_image_prompt } = await req.json();
    if (!postId) return Response.json({ error: "postId is required" }, { status: 400 });

    const post = await base44.asServiceRole.entities.BlogPost.get(postId);
    if (!post) return Response.json({ error: "Post not found" }, { status: 404 });

    const inline = await resolveInlineImages(base44, post.content_markdown);

    let featuredUrl = post.featured_image_url || "";
    let featuredError = null;
    if (!featuredUrl && featured_image_prompt) {
      try {
        featuredUrl = await generateBlogImage(base44, featured_image_prompt);
      } catch (error) {
        featuredError = error.message;
      }
    }

    const now = new Date().toISOString();
    const updated = await base44.asServiceRole.entities.BlogPost.update(post.id, {
      content_markdown: inline.markdown,
      featured_image_url: featuredUrl,
      updated_at: now,
    });

    const problems = [
      inline.failed ? `${inline.failed} inline image(s) failed` : null,
      inline.skipped ? `${inline.skipped} placeholder(s) over the limit were removed` : null,
      featuredError ? `featured image failed: ${featuredError}` : null,
    ].filter(Boolean);

    await base44.asServiceRole.entities.BlogLog.create({
      user_id: post.user_id || user.id,
      event_type: "post_images_resolved",
      related_post_id: post.id,
      status: problems.length ? "warning" : "success",
      message: `Resolved ${inline.resolved} inline image(s) for "${post.title}"${problems.length ? `. ${problems.join("; ")}` : ""}`,
      created_at: now,
    });

    return Response.json({
      post: updated,
      resolved: inline.resolved,
      failed: inline.failed,
      skipped: inline.skipped,
      featured_image_url: featuredUrl,
    });
  } catch (error) {
    console.error("[resolveBlogImages]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});