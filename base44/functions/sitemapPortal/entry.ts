import { SITE_URL, PORTAL_PAGES, buildUrlset, xmlResponse } from "../../shared/sitemapConfig.ts";

// Portal pages. Listed here for internal/navigation reference only — every
// one of these pages already renders <meta name="robots" content="noindex">
// via the SEO component, so they are not indexed even though they appear
// in this file. Kept out of sitemapPages to avoid duplicate URLs.
export default async function (req: Request): Promise<Response> {
  try {
    const lastmod = new Date().toISOString().slice(0, 10);
    const entries = PORTAL_PAGES.map((page) => ({ loc: `${SITE_URL}${page.path}`, lastmod }));
    return xmlResponse(buildUrlset(entries));
  } catch (error) {
    console.error("[sitemapPortal]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}