// Shared sitemap configuration and XML helpers used by all sitemapX backend
// functions. Centralised here so the site's page list and XML formatting
// logic are never duplicated across functions.

export const SITE_URL = "https://ontherunelectrics.com.au";

// Every publicly indexable, non-blog page. Keep in sync with the routes
// registered in src/App.jsx. Do NOT list portal/staff/auth/dynamic routes
// here — those belong in PORTAL_PAGES / STAFF_PAGES or are intentionally
// excluded (login, register, password reset, guest booking, job tracking).
export const PUBLIC_PAGES = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/service-pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/store", changefreq: "weekly", priority: "0.7" },
  { path: "/book", changefreq: "monthly", priority: "0.9" },
  { path: "/blog", changefreq: "daily", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

// Customer portal pages. Every one of these already renders a noindex
// robots meta tag via the SEO component in its page — see PortalAccount.jsx,
// PortalSettings.jsx, ProfileSetup.jsx.
export const PORTAL_PAGES = [
  { path: "/portal" },
  { path: "/portal/settings" },
  { path: "/profile-setup" },
];

// Staff / admin pages. Every one of these already renders a noindex robots
// meta tag via the SEO component in DashboardLayout.jsx (dashboard routes)
// and SystemSettings/AssetManagement/AdminX pages.
export const STAFF_PAGES = [
  { path: "/dashboard" },
  { path: "/dashboard/jobs" },
  { path: "/dashboard/calendar" },
  { path: "/dashboard/invoices" },
  { path: "/dashboard/parts" },
  { path: "/dashboard/blog" },
  { path: "/dashboard/blog/posts" },
  { path: "/dashboard/blog/generate" },
  { path: "/dashboard/blog/taxonomy" },
  { path: "/dashboard/blog/settings" },
  { path: "/dashboard/blog/logs" },
  { path: "/settings" },
  { path: "/asset-management" },
  { path: "/admin/feedback" },
  { path: "/admin/clients" },
  { path: "/admin/activity" },
];

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildUrlset(entries) {
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

export function xmlResponse(xml) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}