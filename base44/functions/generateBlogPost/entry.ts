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

    const LENGTH_MAP = {
      short: { min_words: 800, label: "800-1,200 words" },
      medium: { min_words: 1500, label: "1,500-2,000 words" },
      long: { min_words: 2500, label: "2,500-3,500 words" }
    };
    const lengthSpec = LENGTH_MAP[input.article_length] || LENGTH_MAP.medium;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "gemini_3_1_pro",
      add_context_from_internet: true,
      prompt: `You are a professional content writer for OTR Scooters, a Brisbane-based electric scooter repair and service workshop. Write a high-quality, SEO-friendly blog article that reads like it was written by a real human mechanic who knows their stuff.

TOPIC: ${input.topic}
TARGET KEYWORD: ${input.target_keyword || "derive naturally from the topic"}
SECONDARY KEYWORDS: ${input.secondary_keywords || ""}
SEARCH INTENT: ${input.search_intent || "informational"}
TARGET AUDIENCE: ${input.target_audience || "electric scooter owners in Brisbane and across Queensland"}
TONE: ${input.tone || "helpful, knowledgeable, and genuine — like a trusted local mechanic explaining things to a customer across the counter"}
ARTICLE LENGTH: ${lengthSpec.label} (ABSOLUTE MINIMUM ${lengthSpec.min_words} words — if you write less, the article will be rejected)
CALL TO ACTION: ${input.call_to_action || "Book a scooter repair or service with OTR Scooters"}
CUSTOM INSTRUCTIONS: ${input.custom_instructions || ""}

=== ACCURACY RULES (NON-NEGOTIABLE) ===

1. Every factual claim, statistic, law reference, specification, price, or technical detail MUST be verifiable from real sources. Use the web search context provided to ground your claims. If you cannot verify something, leave it out rather than guess.
2. NEVER invent statistics, test results, performance figures, survey data, or user testimonials. If you need a number, find a real one or make the point without a number.
3. For Queensland or Australian e-scooter laws, reference current legislation accurately. Queensland Personal Mobility Device rules fall under the Transport Operations (Road Use Management — Personal Mobility Devices) Regulation 2019. Do not invent law names, fines, or requirements.
4. Read your entire draft before finalising. Ensure no claim contradicts another claim earlier in the article. If you state a range or spec in one section, it must be consistent everywhere else.
5. Every section must directly serve the topic and search intent. Do not pad with generic filler or tangential content. If the topic is about headlights, every section relates to headlights, visibility, or night riding — not general maintenance.

=== INLINE IMAGES (REQUIRED) ===

6. Insert 2-4 inline image placeholders throughout the article at natural section breaks. Use this exact markdown format, each on its own line:
![Specific descriptive alt text](image:DETAILED_PROMPT_FOR_GENERATING_THIS_PHOTO)
7. Each image prompt must describe a specific, realistic photo that illustrates the content of the section it appears in (e.g., "Close-up of a technician's hands testing an electric scooter headlight beam on a workbench in a well-lit Brisbane repair workshop"). Do not cluster images together — spread them across the article.
8. Also provide a featured image prompt and alt text separately in the response fields.

=== NATURAL WRITING RULES (CRITICAL — THIS IS WHAT SEPARATES HUMAN WRITING FROM OBVIOUS AI OUTPUT) ===

9. DO NOT use em dashes (—) or en dashes (–) ANYWHERE in the article. Use commas, parentheses, colons, or restructure the sentence instead. This is a hard rule.
10. VARY SENTENCE LENGTH AND STRUCTURE. Mix short punchy sentences (5-8 words) with longer complex ones (25+ words, multiple clauses). Do not write in a uniform rhythm of medium-length sentences. Let the rhythm change naturally the way real speech does.
11. AVOID these AI writing hallmarks entirely:
- "It's important to note that..." / "It's worth mentioning that..." / "It's crucial to understand..."
- "In today's fast-paced world..." / "In the ever-evolving world of..."
- "Whether you're a beginner or an experienced rider..." / "Whether you're commuting or riding for fun..."
- "Not only... but also..." constructions
- "When it comes to [topic], ..." as a sentence opener
- "At the end of the day..." / "The bottom line is..." / "Gone are the days..."
- "In the realm of..." / "In the world of..." / "Navigating the landscape of..."
- Starting consecutive paragraphs or sentences with the same word or structure
- Overusing "Furthermore," "Moreover," "Additionally," "Consequently" as paragraph openers
- Ending a section with a one-sentence summary that just restates what was already said
- Rhetorical questions followed immediately by an answer ("Did you know that...? Yes, ...")
12. WRITE LIKE A REAL PERSON. Use contractions naturally (you're, it's, we've, don't, that's). Include occasional first-person workshop perspective where it fits ("We see this issue come through our doors almost every week"). Be direct, practical, and genuinely helpful. Write as if you are a real mechanic talking to a real customer, not a content marketing machine.
13. DO NOT follow a rigid predictable structure. Not every section needs to be the same length. Some H2 sections may need 4 paragraphs, some may need 1. Let the content dictate the shape. Use H2 and H3 headings where they genuinely help the reader navigate, not as a formulaic template.
14. Use bullet lists ONLY when listing genuinely distinct, parallel items (a checklist, a comparison, step-by-step instructions). Most of the article should be flowing paragraphs, not lists.
15. OPEN STRONG. Start with something specific and concrete — a real scenario from a repair workshop, a surprising verifiable fact, a specific question riders actually ask. Do NOT open with "Electric scooters have become increasingly popular" or any variation of a generic trend statement.
16. CLOSE USEFULLY. End with specific, practical advice or a genuine recommendation that flows naturally from the content. Do not end with a generic summary paragraph that restates the article. The call to action should feel earned, not bolted on.

=== SEO RULES ===

17. Use the target keyword naturally in the title, first paragraph, at least one H2 heading, and scattered through the body where it reads naturally. Never stuff or force it.
18. Include secondary keywords only where they fit without sounding awkward.
19. Write clear, descriptive H2 and H3 headings that help a reader scan the article.
20. Write a compelling meta title (under 60 characters) and meta description (under 160 characters) that accurately reflect the article content.

=== OUTPUT FORMAT ===

Return the full article in the full_article_markdown field as markdown. It must be at least ${lengthSpec.min_words} words. Do NOT include an H1 title in the markdown body (the title is stored separately). Include inline image placeholders as specified above. Also fill in inline_image_prompts with the alt text, prompt, and placement context for each inline image so they can be generated and inserted later.`,
      response_json_schema: {
        type: "object",
        properties: {
          title_options: { type: "array", items: { type: "string" } },
          recommended_title: { type: "string" },
          slug: { type: "string" },
          excerpt: { type: "string" },
          outline: { type: "array", items: { type: "string" } },
          full_article_markdown: { type: "string" },
          inline_image_prompts: { type: "array", items: { type: "object", properties: { alt_text: { type: "string" }, prompt: { type: "string" }, placement_context: { type: "string" } } } },
          meta_title: { type: "string" },
          meta_description: { type: "string" },
          suggested_category: { type: "string" },
          suggested_tags: { type: "array", items: { type: "string" } },
          featured_image_prompt: { type: "string" },
          featured_image_alt_text: { type: "string" },
          fact_check_notes: { type: "string" }
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
    const actualWordCount = wordCount(content);
    if (actualWordCount < lengthSpec.min_words) {
      await base44.asServiceRole.entities.BlogLog.create({ user_id: user.id, event_type: "post_generation_rejected_short", status: "error", message: `Draft rejected: ${actualWordCount} words (minimum ${lengthSpec.min_words} for "${input.article_length}" length). Regenerate or choose a shorter length.`, created_at: new Date().toISOString() });
      return Response.json({ error: `Article too short: ${actualWordCount} words. Minimum for "${input.article_length}" length is ${lengthSpec.min_words} words. Please regenerate or adjust the article length setting.`, word_count: actualWordCount, min_required: lengthSpec.min_words }, { status: 422 });
    }
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