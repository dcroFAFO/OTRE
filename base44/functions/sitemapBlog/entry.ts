import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { SITE_URL, buildUrlset, xmlResponse } from "../../shared/sitemapConfig.ts";

// Published blog posts only — drafts, scheduled and archived posts are
// excluded by the status="published" filter. Regenerated on every request
// (short cache) so new/edited posts show up without manual intervention.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const posts = await base44.asServiceRole.entities.BlogPost.filter(
      { status: "published" },
      "-published_at",
      5000
    );

    const seen = new Set();
    const entries = [];
    for (const post of posts) {
      if (!post.slug || !post.published_at) continue;
      const loc = `${SITE_URL}/blog/${post.slug}`;
      if (seen.has(loc)) continue; // prevent duplicate entries
      seen.add(loc);
      entries.push({
        loc,
        lastmod: new Date(post.updated_at || post.published_at).toISOString().slice(0, 10),
        changefreq: "monthly",
        priority: "0.6",
      });
    }

    return xmlResponse(buildUrlset(entries));
  } catch (error) {
    console.error("[sitemapBlog]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}