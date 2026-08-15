// Shared sitemap configuration and XML helpers used by all sitemapX backend
// functions. Centralised here so the site's page list and XML formatting
// logic are never duplicated across functions.

export const SITE_URL = "https://ontherunelectrics.com.au";

// Every publicly indexable, non-blog page. Keep in sync with the routes
// registered in src/config/routeManifest.js. Do NOT list portal/staff/auth or
// non-indexable dynamic routes here (login, password reset, booking, tracking).
export const PUBLIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/service-pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/store", changefreq: "weekly", priority: "0.7" },
  { path: "/blog", changefreq: "daily", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

export function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildUrlset(entries: SitemapEntry[]) {
  const body = entries
    .map(({ loc, lastmod, changefreq, priority }) => {
      let xml = `  <url>\n    <loc>${escapeXml(loc)}</loc>\n`;
      if (lastmod) xml += `    <lastmod>${escapeXml(lastmod)}</lastmod>\n`;
      if (changefreq) xml += `    <changefreq>${escapeXml(changefreq)}</changefreq>\n`;
      if (priority) xml += `    <priority>${escapeXml(priority)}</priority>\n`;
      xml += "  </url>";
      return xml;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function xmlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
