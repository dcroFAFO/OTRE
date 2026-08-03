// Shared blog image helpers.
//
// The AI writer emits inline image placeholders in the form:
//   ![Descriptive alt text](image:A DETAILED PROMPT FOR THIS PHOTO)
//
// "image:..." is not a valid URL, so if a post is saved with placeholders left
// in place the published article renders broken images. Every code path that
// creates or regenerates blog content must run the markdown through
// resolveInlineImages() before saving.

const PLACEHOLDER_PATTERN = /!\[([^\]]*)\]\(image:([^)]+)\)/g;

// Hard cap per article. Each generated image costs integration credits, and the
// writer is instructed to emit 2-4. Anything beyond this is dropped rather than
// generated so a malformed draft cannot run up an unbounded bill.
const MAX_INLINE_IMAGES = 4;

const STYLE_SUFFIX =
  "Realistic documentary photograph, natural lighting, sharp focus, " +
  "electric scooter repair workshop context, no text, no watermarks, no logos.";

function buildPrompt(prompt: string, altText: string) {
  const readable = String(prompt || "")
    .replace(/_/g, " ")
    .trim();
  return [readable, altText, STYLE_SUFFIX].filter(Boolean).join(". ");
}

/**
 * Generates a single blog image and returns its permanent URL.
 * Throws if generation fails so the caller can decide how to handle it.
 */
export async function generateBlogImage(base44, prompt: string, altText = "") {
  const result = await base44.asServiceRole.integrations.Core.GenerateImage({
    prompt: buildPrompt(prompt, altText),
  });
  const url = result?.url;
  if (!url) throw new Error("Image generation returned no URL");
  return url;
}

/**
 * Replaces every ![alt](image:PROMPT) placeholder in the markdown with a real
 * generated image. Placeholders that fail to generate, and any beyond
 * MAX_INLINE_IMAGES, are REMOVED from the markdown so the published article
 * never contains a broken image.
 *
 * Returns { markdown, resolved, failed, skipped } — the caller is expected to
 * surface non-zero failed/skipped counts (e.g. into BlogLog) rather than
 * ignore them.
 */
export async function resolveInlineImages(base44, markdown: string) {
  const source = String(markdown || "");
  const matches = [...source.matchAll(PLACEHOLDER_PATTERN)];
  if (matches.length === 0) {
    return { markdown: source, resolved: 0, failed: 0, skipped: 0 };
  }

  const replacements = new Map<string, string>();
  let resolved = 0;
  let failed = 0;
  let skipped = 0;

  for (const [index, match] of matches.entries()) {
    const [placeholder, altText, prompt] = match;
    if (replacements.has(placeholder)) continue;

    if (index >= MAX_INLINE_IMAGES) {
      replacements.set(placeholder, "");
      skipped += 1;
      continue;
    }

    // Sequential on purpose: image generation is slow and credit-metered, and
    // firing them all at once risks provider rate limits mid-article.
    try {
      const url = await generateBlogImage(base44, prompt, altText);
      replacements.set(placeholder, `![${altText || "Article image"}](${url})`);
      resolved += 1;
    } catch (error) {
      console.warn("[blogImages] inline image failed:", prompt, error.message);
      replacements.set(placeholder, "");
      failed += 1;
    }
  }

  let output = source;
  for (const [placeholder, replacement] of replacements.entries()) {
    output = output.split(placeholder).join(replacement);
  }
  // Collapse the blank lines left behind by removed placeholders.
  output = output.replace(/\n{3,}/g, "\n\n").trim();

  return { markdown: output, resolved, failed, skipped };
}