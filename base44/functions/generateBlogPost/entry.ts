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
    const input = await req.json();
    if (!input.topic) return Response.json({ error: "Topic is required" }, { status: 400 });

    const settings = (await base44.asServiceRole.entities.BlogSettings.filter({ user_id: user.id }, "-created_date", 1))[0];
    if (settings && settings.enable_ai_generation === false) return Response.json({ error: "AI blog generation is disabled in blog settings" }, { status: 403 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Create an SEO-friendly blog draft for OTR Scooters. Topic: ${input.topic}. Target keyword: ${input.target_keyword || ""}. Secondary keywords: ${input.secondary_keywords || ""}. Search intent: ${input.search_intent || "informational"}. Target audience: ${input.target_audience || "electric scooter owners"}. Tone: ${input.tone || "helpful and professional"}. Article length: ${input.article_length || "medium"}. Call to action: ${input.call_to_action || "Book a scooter repair or service"}. Custom instructions: ${input.custom_instructions || ""}. Writing rules: do not invent fake statistics, do not invent fake testimonials, avoid keyword stuffing, write clearly for humans first, match search intent, use clear headings, short paragraphs, strong intro, useful conclusion, and one clear call to action. Return markdown article content.`,
      response_json_schema: {
        type: "object",
        properties: {
          title_options: { type: "array", items: { type: "string" } },
          recommended_title: { type: "string" },
          slug: { type: "string" },
          excerpt: { type: "string" },
          outline: { type: "array", items: { type: "string" } },
          full_article_markdown: { type: "string" },
          meta_title: { type: "string" },
          meta_description: { type: "string" },
          suggested_category: { type: "string" },
          suggested_tags: { type: "array", items: { type: "string" } },
          featured_image_prompt: { type: "string" },
          featured_image_alt_text: { type: "string" }
        },
        required: ["recommended_title", "slug", "excerpt", "full_article_markdown", "meta_title", "meta_description"]
      }
    });

    const now = new Date().toISOString();
    const title = result.recommended_title || input.topic;
    let slug = slugify(result.slug || title);
    const existing = await base44.asServiceRole.entities.BlogPost.filter({ user_id: user.id, slug }, "", 1);
    if (existing.length) slug = `${slug}-${Date.now().toString().slice(-5)}`;
    const content = result.full_article_markdown || "";
    const post = await base44.asServiceRole.entities.BlogPost.create({
      user_id: user.id,
      title,
      slug,
      excerpt: result.excerpt || "",
      content_markdown: content,
      content_html: "",
      status: "draft",
      target_keyword: input.target_keyword || "",
      category_id: input.category_id || "",
      tag_ids: Array.isArray(input.tag_ids) ? input.tag_ids : [],
      author_name: settings?.default_author_name || user.full_name || "OTR Scooters",
      author_bio: settings?.default_author_bio || "",
      author_avatar_url: settings?.default_author_avatar_url || "",
      featured_image_alt: result.featured_image_alt_text || "",
      meta_title: result.meta_title || title,
      meta_description: result.meta_description || result.excerpt || "",
      word_count: wordCount(content),
      reading_time_minutes: readingTime(content),
      created_at: now,
      updated_at: now
    });
    await base44.asServiceRole.entities.BlogLog.create({ user_id: user.id, event_type: "post_generated_with_ai", related_post_id: post.id, status: "success", message: `Generated draft: ${title}`, created_at: now });
    return Response.json({ post, generated: result });
  } catch (error) {
    console.error("[generateBlogPost]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});