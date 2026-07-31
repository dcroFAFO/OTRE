import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { SITE_URL } from "../../shared/sitemapConfig.ts";

// Submits the sitemap index to Google Search Console so Google recrawls it
// promptly. Admin-only — uses the workspace's Search Console connection.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin access required" }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("google_search_console");

    // This property is registered in Search Console as a domain property
    // (sc-domain:ontherunelectrics.com.au), not a URL-prefix property, so the
    // site resource id must use the sc-domain: format.
    const siteUrl = "sc-domain:ontherunelectrics.com.au";
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[submitSitemapToSearchConsole] Search Console API error", response.status, errorText);
      return Response.json({ error: `Search Console API error (${response.status}): ${errorText}` }, { status: 502 });
    }

    return Response.json({ success: true, submitted: sitemapUrl });
  } catch (error) {
    console.error("[submitSitemapToSearchConsole]", error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
}