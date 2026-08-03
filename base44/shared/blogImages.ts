// Shared blog image generation used by generateBlogPost and resolveBlogImages.
// The AI writer emits inline placeholders in the form:
//   ![Alt text](image:A DETAILED PROMPT DESCRIBING THE PHOTO)
// These are NOT valid image URLs, so they must be resolved into real generated
// images before a post is saved, otherwise the public article renders broken
// image icons. Centralised here so the two callers never duplicate the logic.

const PLACEHOLDER_PATTERN = /!\[([^\]]*)\]\(image:([^)]+)\)/g;

// Hard cap: each image costs credits and ~5-10s. Generating in parallel keeps
// the whole pipeline inside the function timeout.
const MAX_INLINE_IMAGES = 3;

const STYLE_SUFFIX =
  "Photorealistic documentary photograph, natural lighting, sharp focus, no text or watermarks.";

export async function generateBlogImage(base44, prompt) {
  const result = await base44.asServiceRole.integrations.Core.GenerateImage({
    prompt: `${String(prompt || "").trim()}. ${STYLE_SUFFIX}`,
  });
  return result?.url || "";
}

// Returns { markdown, resolved, failed, skipped }.
// Failures are reported to the caller (which logs them to BlogLog) rather than
// being swallowed. A placeholder that cannot be generated is removed, because
// leaving it in the markdown renders a broken image to the public.
export async function resolveInlineImages(base44, markdown) {
  const source = String(markdown || "");
  const matches = [...source.matchAll(PLACEHOLDER_PATTERN)];
  if (matches.length === 0) return { markdown: source, resolved: 0, failed: 0, skipped: 0 };

  const targets = matches.slice(0, MAX_INLINE_IMAGES);
  const skipped = matches.length - targets.length;

  const results = await Promise.all(
    targets.map(async ([full, alt, prompt]) => {
      try {
        const url = await generateBlogImage(base44, prompt);
        return { full, alt, url, error: url ? null : "GenerateImage returned no url" };
      } catch (error) {
        return { full, alt, url: "", error: error.message };
      }
    })
  );

  let out = source;
  let resolved = 0;
  let failed = 0;
  const errors = [];

  for (const item of results) {
    if (item.url) {
      out = out.replace(item.full, `![${item.alt}](${item.url})`);
      resolved += 1;
    } else {
      out = out.replace(item.full, "");
      failed += 1;
      errors.push(item.error);
    }
  }

  // Any placeholders beyond the cap must still be stripped so nothing broken
  // reaches the published article.
  if (skipped > 0) out = out.replace(PLACEHOLDER_PATTERN, "");

  return { markdown: out, resolved, failed, skipped, errors };
}