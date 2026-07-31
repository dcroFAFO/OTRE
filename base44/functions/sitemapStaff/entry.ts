import { SITE_URL, STAFF_PAGES, buildUrlset, xmlResponse } from "../../shared/sitemapConfig.ts";

// Staff/admin pages. Listed here for internal reference only — every one of
// these pages already renders <meta name="robots" content="noindex"> via
// the SEO component (DashboardLayout, SystemSettings, AdminX pages), and
// all are gated behind staff-only auth. Kept out of sitemapPages to avoid
// duplicate URLs and to avoid exposing private routes as "indexable".
export default async function (req: Request): Promise<Response> {
  try {
    const lastmod = new Date().toISOString().slice(0, 10);
    const entries = STAFF_PAGES.map((page) => ({ loc: `${SITE_URL}${page.path}`, lastmod }));
    return xmlResponse(buildUrlset(entries));
  } catch (error) {
    console.error("[sitemapStaff]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}