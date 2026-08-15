import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import { checkRateLimit, clientIp } from '../../shared/rateLimit.ts';

const clean = (value, maxLength = 2000) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);

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

const settingsPublic = (settings) => settings ? ({
  blog_enabled: settings.blog_enabled !== false,
  blog_name: clean(settings.blog_name, 160) || 'Blog',
  blog_description: clean(settings.blog_description, 1000),
  posts_per_page: Math.min(Math.max(Number(settings.posts_per_page) || 9, 1), 50),
  show_author_box: settings.show_author_box !== false,
  show_related_posts: settings.show_related_posts !== false,
}) : null;

const categoryPublic = (category) => ({
  id: category.id,
  name: clean(category.name, 160),
  slug: clean(category.slug, 120),
  description: clean(category.description, 1000),
});

const tagPublic = (tag) => ({
  id: tag.id,
  name: clean(tag.name, 160),
  slug: clean(tag.slug, 120),
  description: clean(tag.description, 1000),
});

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "index";

    if (action === 'comments') {
      const postId = clean(payload.post_id, 120);
      if (!postId) return Response.json({ error: 'post_id is required.' }, { status: 400 });
      const post = await base44.asServiceRole.entities.BlogPost.get(postId).catch(() => null);
      if (!post || post.status !== 'published') return Response.json({ error: 'Article not found.' }, { status: 404 });
      const user = await base44.auth.me().catch(() => null);
      const comments = await base44.asServiceRole.entities.BlogComment.filter({ post_id: postId, status: 'visible' }, 'created_date', 200).catch(() => []);
      return Response.json({ comments: comments.map((comment) => ({ id: comment.id, post_id: comment.post_id, author_name: clean(comment.author_name, 160), content: clean(comment.content, 2000), created_date: comment.created_date, can_delete: Boolean(user && (user.role === 'admin' || comment.author_user_id === user.id)) })), potentially_truncated: comments.length === 200, limit: 200 });
    }

    if (action === 'comment_create') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Sign in to comment.' }, { status: 401 });
      const postId = clean(payload.post_id, 120);
      const content = clean(payload.content, 2000);
      if (!postId || !content) return Response.json({ error: 'A post and comment are required.' }, { status: 400 });
      const limit = await checkRateLimit(base44, `blog-comment:${user.id}:${clientIp(req)}`, 5);
      if (!limit.allowed) return Response.json({ error: 'Too many comments were submitted. Please wait before trying again.' }, { status: 429 });
      const post = await base44.asServiceRole.entities.BlogPost.get(postId).catch(() => null);
      if (!post || post.status !== 'published') return Response.json({ error: 'Article not found.' }, { status: 404 });
      const record = await base44.asServiceRole.entities.BlogComment.create({
        post_id: post.id,
        post_slug: clean(post.slug, 120),
        author_name: clean(user.full_name, 160) || 'Reader',
        author_user_id: user.id,
        content,
        status: 'visible',
      });
      return Response.json({ comment: { id: record.id, post_id: record.post_id, author_name: clean(record.author_name, 160), content: clean(record.content, 2000), created_date: record.created_date, can_delete: true } }, { status: 201 });
    }

    if (action === 'comment_delete') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: 'Sign in to delete a comment.' }, { status: 401 });
      const comment = await base44.asServiceRole.entities.BlogComment.get(clean(payload.comment_id, 120)).catch(() => null);
      if (!comment || (user.role !== 'admin' && comment.author_user_id !== user.id)) return Response.json({ error: 'Comment not found.' }, { status: 404 });
      await base44.asServiceRole.entities.BlogComment.delete(comment.id);
      return Response.json({ deleted: true });
    }

    const rawSettings = (await base44.asServiceRole.entities.BlogSettings.list("-created_date", 1))[0] || null;
    const settings = settingsPublic(rawSettings);
    if (rawSettings && rawSettings.blog_enabled === false) {
      return Response.json({ settings, posts: [], categories: [], tags: [], post: null, potentially_truncated: false });
    }

    const [allPosts, rawCategories, rawTags] = await Promise.all([
      base44.asServiceRole.entities.BlogPost.filter({ status: "published" }, "-published_at", 500),
      base44.asServiceRole.entities.BlogCategory.filter({ is_active: true }, "name", 200),
      base44.asServiceRole.entities.BlogTag.filter({ is_active: true }, "name", 200)
    ]);
    const categories = rawCategories.map(categoryPublic);
    const tags = rawTags.map(tagPublic);
    const posts = allPosts
      .filter((post) => post.title && post.slug && post.published_at)
      .map(postPublic);

    if (action === "post") {
      const post = posts.find((item) => item.slug === payload.slug) || null;
      const related = post
        ? posts.filter((item) => item.id !== post.id && (item.category_id === post.category_id || item.tag_ids?.some((id) => post.tag_ids?.includes(id)))).slice(0, 3)
        : [];
      return Response.json({ settings, post, related, categories, tags, potentially_truncated: allPosts.length === 500 || rawCategories.length === 200 || rawTags.length === 200, limits: { posts: 500, categories: 200, tags: 200 } });
    }
    if (action === "category") {
      const category = categories.find((item) => item.slug === payload.slug) || null;
      return Response.json({ settings, posts: category ? posts.filter((post) => post.category_id === category.id) : [], category, categories, tags, potentially_truncated: allPosts.length === 500 || rawCategories.length === 200 || rawTags.length === 200, limits: { posts: 500, categories: 200, tags: 200 } });
    }
    if (action === "tag") {
      const tag = tags.find((item) => item.slug === payload.slug) || null;
      return Response.json({ settings, posts: tag ? posts.filter((post) => post.tag_ids?.includes(tag.id)) : [], tag, categories, tags, potentially_truncated: allPosts.length === 500 || rawCategories.length === 200 || rawTags.length === 200, limits: { posts: 500, categories: 200, tags: 200 } });
    }
    return Response.json({ settings, posts, categories, tags, potentially_truncated: allPosts.length === 500 || rawCategories.length === 200 || rawTags.length === 200, limits: { posts: 500, categories: 200, tags: 200 } });
  } catch (error) {
    console.error("[publicBlog]", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Articles are temporarily unavailable." }, { status: 500 });
  }
});
