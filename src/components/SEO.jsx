import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "On The Run Electrics";
const DEFAULT_TITLE = "On The Run Electrics | Electric Scooter Repairs";
const DEFAULT_DESCRIPTION = "Book expert electric scooter repairs, servicing and diagnostics with On The Run Electrics, including transparent quotes and online job tracking.";
const DEFAULT_IMAGE = undefined;

function absoluteUrl(value) {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === "undefined") return value;
  return new URL(value, window.location.origin).toString();
}

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
  const canonicalUrl = absoluteUrl(canonical || (typeof window !== "undefined" ? window.location.pathname : "/"));
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
      <meta name="robots" content={noindex ? "noindex,nofollow" : "index,follow"} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_AU" />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={pageOgTitle} />
      {pageOgDescription && <meta property="og:description" content={pageOgDescription} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {shareImage && <meta property="og:image" content={shareImage} />}

      <meta name="twitter:card" content={shareImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={pageTwitterTitle} />
      {pageTwitterDescription && <meta name="twitter:description" content={pageTwitterDescription} />}
      {shareImage && <meta name="twitter:image" content={shareImage} />}

      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}