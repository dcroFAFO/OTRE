import { SITE_URL, PUBLIC_PAGES, buildUrlset, xmlResponse } from "../../shared/sitemapConfig.ts";

// Public, indexable, non-blog pages. No auth — must be reachable by crawlers.
export default function (_req: Request): Response {
  try {
    const lastmod = new Date().toISOString().slice(0, 10);
    const entries = PUBLIC_PAGES.map((page) => ({
      loc: `${SITE_URL}${page.path}`,
      lastmod,
      changefreq: page.changefreq,
      priority: page.priority,
    }));
    return xmlResponse(buildUrlset(entries));
  } catch (error) {
    console.error("[sitemapPages]", error);
    return Response.json({ error: "Sitemap generation failed" }, { status: 500 });
  }
}
