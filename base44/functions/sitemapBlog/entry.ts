import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { SITE_URL, buildUrlset, xmlResponse } from "../../shared/sitemapConfig.ts";

const PAGE_SIZE = 1000;
const MAX_SITEMAP_URLS = 50_000;

function sitemapDate(value: unknown): string | undefined {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

// Published blog posts only — drafts, scheduled and archived posts are
// excluded by the status="published" filter. Regenerated on every request
// (short cache) so new/edited posts show up without manual intervention.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const seen = new Set();
    const entries = [];
    for (let skip = 0; skip < MAX_SITEMAP_URLS; skip += PAGE_SIZE) {
      const posts = await base44.asServiceRole.entities.BlogPost.filter(
        { status: "published" },
        "-published_at",
        PAGE_SIZE,
        skip,
        ["slug", "published_at", "updated_at"],
      );
      for (const post of posts) {
        if (!post.slug || !post.published_at) continue;
        const loc = `${SITE_URL}/blog/${encodeURIComponent(post.slug)}`;
        if (seen.has(loc)) continue;
        seen.add(loc);
        entries.push({
          loc,
          lastmod: sitemapDate(post.updated_at || post.published_at),
          changefreq: "monthly",
          priority: "0.6",
        });
      }
      if (posts.length < PAGE_SIZE) break;
    }

    return xmlResponse(buildUrlset(entries));
  } catch (error) {
    console.error("[sitemapBlog]", error);
    return Response.json({ error: "Sitemap generation failed" }, { status: 500 });
  }
}
