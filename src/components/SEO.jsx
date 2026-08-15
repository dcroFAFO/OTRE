import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "On The Run Electrics";
const DEFAULT_SITE_ORIGIN = "https://ontherunelectrics.com.au";
const SITE_ORIGIN = siteOrigin(import.meta.env.VITE_PUBLIC_SITE_URL);
const DEFAULT_TITLE = "On The Run Electrics | Electric Scooter Repairs";
const DEFAULT_DESCRIPTION = "Book expert electric scooter repairs, servicing and diagnostics with On The Run Electrics, including transparent quotes and online job tracking.";
const DEFAULT_IMAGE = undefined;

function siteOrigin(value) {
  try {
    const url = new URL(value || DEFAULT_SITE_ORIGIN);
    return url.protocol === "https:" ? url.origin : DEFAULT_SITE_ORIGIN;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

function absoluteUrl(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (url.protocol !== "https:") return undefined;
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function canonicalUrl(value) {
  const resolved = absoluteUrl(value);
  if (!resolved) return undefined;
  return new URL(resolved).origin === SITE_ORIGIN ? resolved : undefined;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/**
 * @param {{
 *   title?: string,
 *   description?: string,
 *   canonical?: string,
 *   ogTitle?: string,
 *   ogDescription?: string,
 *   ogImage?: string,
 *   ogType?: string,
 *   twitterTitle?: string,
 *   twitterDescription?: string,
 *   twitterImage?: string,
 *   noindex?: boolean,
 *   structuredData?: Record<string, any> | Record<string, any>[]
 * }} props
 */
export default function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogTitle,
  ogDescription,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  twitterTitle,
  twitterDescription,
  twitterImage,
  noindex = false,
  structuredData,
}) {
  const pageTitle = title;
  const pageDescription = description;
  const pageCanonicalUrl = canonicalUrl(canonical || (typeof window !== "undefined" ? window.location.pathname : "/"));
  const shareImage = absoluteUrl(twitterImage || ogImage);
  const pageOgTitle = ogTitle || pageTitle;
  const pageOgDescription = ogDescription || pageDescription;
  const pageTwitterTitle = twitterTitle || pageOgTitle;
  const pageTwitterDescription = twitterDescription || pageOgDescription;
  const schemas = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{pageTitle}</title>
      {pageDescription && <meta name="description" content={pageDescription} />}
      <meta name="robots" content={noindex ? "noindex,nofollow,noarchive" : "index,follow"} />
      {pageCanonicalUrl && <link rel="canonical" href={pageCanonicalUrl} />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_AU" />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={pageOgTitle} />
      {pageOgDescription && <meta property="og:description" content={pageOgDescription} />}
      {pageCanonicalUrl && <meta property="og:url" content={pageCanonicalUrl} />}
      {shareImage && <meta property="og:image" content={shareImage} />}

      <meta name="twitter:card" content={shareImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={pageTwitterTitle} />
      {pageTwitterDescription && <meta name="twitter:description" content={pageTwitterDescription} />}
      {shareImage && <meta name="twitter:image" content={shareImage} />}

      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {safeJson(schema)}
        </script>
      ))}
    </Helmet>
  );
}
