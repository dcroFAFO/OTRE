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

const CONTENTFUL_SPACE_ID = "s78atic9b8ob";
const CONTENTFUL_ENVIRONMENT_ID = "master";
const CONTENTFUL_POST_TYPE = "pageBlogPost";

const localized = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.nodeType || value.sys) return value;
  if (Object.prototype.hasOwnProperty.call(value, "en-US")) return value["en-US"];
  const values = Object.values(value);
  return values.length ? values[0] : undefined;
};

const linkId = (value) => localized(value)?.sys?.id || null;
const assetUrl = (asset) => {
  const url = localized(asset?.fields?.file)?.url;
  if (!url) return "";
  return url.startsWith("//") ? `https:${url}` : url;
};

const richTextToMarkdown = (node, assets, entries) => {
  if (!node) return "";
  if (node.nodeType === "text") {
    let text = node.value || "";
    for (const mark of node.marks || []) {
      if (mark.type === "bold") text = `**${text}**`;
      if (mark.type === "italic") text = `*${text}*`;
      if (mark.type === "code") text = `\`${text}\``;
    }
    return text;
  }
  const children = () => (node.content || []).map((child) => richTextToMarkdown(child, assets, entries)).join("");
  if (node.nodeType === "document") return (node.content || []).map((child) => richTextToMarkdown(child, assets, entries)).filter(Boolean).join("\n\n");
  if (node.nodeType === "paragraph") return children();
  if (/^heading-[1-6]$/.test(node.nodeType)) return `${"#".repeat(Number(node.nodeType.slice(-1)))} ${children()}`;
  if (node.nodeType === "blockquote") return children().split("\n").map((line) => `> ${line}`).join("\n");
  if (node.nodeType === "unordered-list") return (node.content || []).map((child) => `- ${richTextToMarkdown(child, assets, entries)}`).join("\n");
  if (node.nodeType === "ordered-list") return (node.content || []).map((child, index) => `${index + 1}. ${richTextToMarkdown(child, assets, entries)}`).join("\n");
  if (node.nodeType === "list-item") return children().trim();
  if (node.nodeType === "hr") return "---";
  if (node.nodeType === "hyperlink") return `[${children()}](${node.data?.uri || "#"})`;
  if (node.nodeType === "embedded-asset-block") {
    const asset = assets.get(node.data?.target?.sys?.id);
    const url = assetUrl(asset);
    return url ? `![${localized(asset?.fields?.description) || localized(asset?.fields?.title) || "Article image"}](${url})` : "";
  }
  if (node.nodeType === "embedded-entry-block") {
    const entry = entries.get(node.data?.target?.sys?.id);
    if (entry?.sys?.contentType?.sys?.id !== "componentRichImage") return "";
    const asset = assets.get(linkId(entry.fields?.image));
    const url = assetUrl(asset);
    const caption = localized(entry.fields?.caption) || localized(asset?.fields?.description) || localized(asset?.fields?.title) || "Article image";
    return url ? `![${caption}](${url})${localized(entry.fields?.caption) ? `\n\n*${localized(entry.fields.caption)}*` : ""}` : "";
  }
  return children();
};

const fetchContentfulItems = async (accessToken, resource) => {
  const items = [];
  let skip = 0;
  while (true) {
    const url = `https://api.contentful.com/spaces/${CONTENTFUL_SPACE_ID}/environments/${CONTENTFUL_ENVIRONMENT_ID}/${resource}?limit=1000&skip=${skip}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`Contentful ${resource} request failed (${response.status})`);
    const page = await response.json();
    items.push(...(page.items || []));
    skip += page.items?.length || 0;
    if (!page.items?.length || skip >= page.total) break;
  }
  return items;
};

const listContentfulPosts = async (base44) => {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("contentful");
  const [allEntries, allAssets] = await Promise.all([
    fetchContentfulItems(accessToken, "entries"),
    fetchContentfulItems(accessToken, "assets")
  ]);
  const entries = new Map(allEntries.map((entry) => [entry.sys.id, entry]));
  const assets = new Map(allAssets.map((asset) => [asset.sys.id, asset]));

  return allEntries
    .filter((entry) => entry.sys.contentType?.sys?.id === CONTENTFUL_POST_TYPE && entry.sys.publishedVersion && !entry.sys.archivedVersion)
    .map((entry) => {
      const fields = entry.fields || {};
      const author = entries.get(linkId(fields.author));
      const seo = entries.get(linkId(fields.seoFields));
      const featuredImage = assets.get(linkId(fields.featuredImage));
      const contentMarkdown = richTextToMarkdown(localized(fields.content), assets, entries);
      const wordCount = contentMarkdown.trim().split(/\s+/).filter(Boolean).length;
      return {
        id: `contentful-${entry.sys.id}`,
        title: localized(fields.title) || localized(fields.internalName),
        slug: localized(fields.slug),
        excerpt: localized(fields.shortDescription) || "",
        content_markdown: contentMarkdown,
        category_id: null,
        tag_ids: [],
        author_name: localized(author?.fields?.name) || "On The Run Electrics",
        author_bio: "",
        author_avatar_url: assetUrl(assets.get(linkId(author?.fields?.avatar))),
        featured_image_url: assetUrl(featuredImage),
        featured_image_alt: localized(featuredImage?.fields?.description) || localized(featuredImage?.fields?.title) || localized(fields.title),
        meta_title: localized(seo?.fields?.pageTitle) || localized(fields.title),
        meta_description: localized(seo?.fields?.pageDescription) || localized(fields.shortDescription) || "",
        canonical_url: localized(seo?.fields?.canonicalUrl) || "",
        reading_time_minutes: Math.max(1, Math.ceil(wordCount / 220)),
        word_count: wordCount,
        published_at: localized(fields.publishedDate) || entry.sys.publishedAt,
        created_date: entry.sys.createdAt,
        source: "contentful"
      };
    })
    .filter((post) => post.title && post.slug && post.published_at);
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = payload.action || "index";
    if (action === "sync") {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
      if (!["admin", "employee", "technician"].includes(user.role)) return Response.json({ error: "Staff access required" }, { status: 403 });
    }
    const settings = (await base44.asServiceRole.entities.BlogSettings.list("-created_date", 1))[0] || null;
    if (settings && settings.blog_enabled === false) return Response.json({ settings, posts: [], categories: [], tags: [], post: null });
    const [allPosts, contentfulPosts, categories, tags] = await Promise.all([
      base44.asServiceRole.entities.BlogPost.filter({ status: "published" }, "-published_at", 500),
      listContentfulPosts(base44),
      base44.asServiceRole.entities.BlogCategory.filter({ is_active: true }, "name", 200),
      base44.asServiceRole.entities.BlogTag.filter({ is_active: true }, "name", 200)
    ]);
    const localPosts = allPosts.filter((post) => post.title && post.slug && post.published_at).map(postPublic);
    const postsBySlug = new Map(localPosts.map((post) => [post.slug, post]));
    contentfulPosts.forEach((post) => postsBySlug.set(post.slug, post));
    const posts = [...postsBySlug.values()].sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
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
    return Response.json({ settings, posts, categories, tags, synced_at: action === "sync" ? new Date().toISOString() : undefined });
  } catch (error) {
    console.error("[publicBlog]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});