import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const postPublic = (post) => ({
  id: post.id,
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  content_markdown: post.content_markdown,
  category_id: post.category_id,
  tag_ids: post.tag_ids || [],
  author_name: post.author_name,
  author_bio: post.author_bio,
  author_avatar_url: post.author_avatar_url,
  featured_image_url: post.featured_image_url,
  featured_image_alt: post.featured_image_alt,
  meta_title: post.meta_title,
  meta_description: post.meta_description,
  canonical_url: post.canonical_url,
  reading_time_minutes: post.reading_time_minutes,
  word_count: post.word_count,
  published_at: post.published_at,
  created_date: post.created_date
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "index";
    const settings = (await base44.asServiceRole.entities.BlogSettings.list("-created_date", 1))[0] || null;
    if (settings && settings.blog_enabled === false) return Response.json({ settings, posts: [], categories: [], tags: [], post: null });
    const [allPosts, categories, tags] = await Promise.all([
      base44.asServiceRole.entities.BlogPost.filter({ status: "published" }, "-published_at", 500),
      base44.asServiceRole.entities.BlogCategory.filter({ is_active: true }, "name", 200),
      base44.asServiceRole.entities.BlogTag.filter({ is_active: true }, "name", 200)
    ]);
    const posts = allPosts.filter((post) => post.title && post.slug && post.published_at).map(postPublic);
    if (action === "post") {
      const post = posts.find((item) => item.slug === payload.slug) || null;
      const related = post ? posts.filter((item) => item.id !== post.id && (item.category_id === post.category_id || item.tag_ids?.some((id) => post.tag_ids?.includes(id)))).slice(0, 3) : [];
      return Response.json({ settings, post, related, categories, tags });
    }
    let filtered = posts;
    if (action === "category") {
      const category = categories.find((item) => item.slug === payload.slug) || null;
      filtered = category ? posts.filter((post) => post.category_id === category.id) : [];
      return Response.json({ settings, posts: filtered, category, categories, tags });
    }
    if (action === "tag") {
      const tag = tags.find((item) => item.slug === payload.slug) || null;
      filtered = tag ? posts.filter((post) => post.tag_ids?.includes(tag.id)) : [];
      return Response.json({ settings, posts: filtered, tag, categories, tags });
    }
    return Response.json({ settings, posts, categories, tags });
  } catch (error) {
    console.error("[publicBlog]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});