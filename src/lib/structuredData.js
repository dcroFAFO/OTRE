import { DEFAULT_BUSINESS, DEFAULT_SERVICES } from "@/config/platformConfig";

const SITE_URL = "https://ontherunelectrics.com.au";
const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function dayList(label = "") {
  const lower = label.toLowerCase();
  if ((lower.includes("monday") || lower.includes("mon")) && (lower.includes("sunday") || lower.includes("sun")) && /[-–—]/.test(label)) return WEEK_DAYS;
  const matches = WEEK_DAYS.filter((day) => lower.includes(day.toLowerCase()) || lower.includes(day.slice(0, 3).toLowerCase()));
  return matches.length ? matches : WEEK_DAYS;
}

function openingHours(business) {
  return (business.openingHours || DEFAULT_BUSINESS.openingHours).map((row) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: dayList(row.day),
    opens: row.opens || "11:00",
    closes: row.closes || "23:59",
  }));
}

function postalAddress(business) {
  return {
    "@type": "PostalAddress",
    streetAddress: business.addressLine1 || DEFAULT_BUSINESS.addressLine1,
    addressLocality: business.locality || DEFAULT_BUSINESS.locality,
    addressRegion: business.region || DEFAULT_BUSINESS.region,
    postalCode: business.postcode || DEFAULT_BUSINESS.postcode,
    addressCountry: business.country || DEFAULT_BUSINESS.country,
  };
}

function businessEntity(business = DEFAULT_BUSINESS) {
  return {
    "@type": "AutoRepair",
    name: business.name || DEFAULT_BUSINESS.name,
    legalName: business.legalName || business.name || DEFAULT_BUSINESS.legalName,
    url: business.websiteUrl || SITE_URL,
    description: business.subheading || DEFAULT_BUSINESS.subheading,
    telephone: business.phoneE164 || DEFAULT_BUSINESS.phoneE164,
    email: business.email || DEFAULT_BUSINESS.email,
    priceRange: "$$",
    areaServed: "Brisbane",
    address: postalAddress(business),
    openingHoursSpecification: openingHours(business),
    ...(business.abn ? { taxID: business.abn } : {}),
  };
}

export function getLocalBusinessSchema(business = DEFAULT_BUSINESS, services = DEFAULT_SERVICES) {
  const entity = businessEntity(business);
  return {
    "@context": "https://schema.org",
    ...entity,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Electric scooter services",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: service.name || service },
      })),
    },
  };
}

export function getAboutPageSchema(business = DEFAULT_BUSINESS) {
  return { "@context": "https://schema.org", "@type": "AboutPage", name: `About ${business.name}`, url: `${SITE_URL}/about`, mainEntity: businessEntity(business) };
}

export function getContactPageSchema(business = DEFAULT_BUSINESS) {
  return { "@context": "https://schema.org", "@type": "ContactPage", name: `Contact ${business.name}`, url: `${SITE_URL}/contact`, mainEntity: businessEntity(business) };
}

export function getServicePricingSchema(business = DEFAULT_BUSINESS) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Electric scooter service pricing",
    url: `${SITE_URL}/service-pricing`,
    description: `Transparent pricing for electric scooter repairs, servicing and diagnostics at ${business.name} in ${business.locality || "Woolloongabba"}, Brisbane.`,
    provider: businessEntity(business),
  };
}

export function getStoreSchema(business = DEFAULT_BUSINESS) {
  const entity = businessEntity(business);
  return {
    "@context": "https://schema.org",
    ...entity,
    "@type": "Store",
    name: `${business.name} Parts Store`,
    url: `${SITE_URL}/store`,
    description: `Electric scooter parts and service items available for workshop pickup from ${business.name}.`,
  };
}

export function getBlogIndexSchema(business = DEFAULT_BUSINESS) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${business.name} News & Insights`,
    url: `${SITE_URL}/blog`,
    description: "Practical advice, local rider news and stories from Brisbane's electric scooter specialists.",
    publisher: businessEntity(business),
  };
}

export function getTermsPageSchema(business = DEFAULT_BUSINESS) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Terms & Conditions, Privacy Policy | ${business.name}`,
    url: `${SITE_URL}/terms`,
    description: `Privacy, service, website and data handling terms for ${business.name}.`,
    publisher: businessEntity(business),
  };
}

export const localBusinessSchema = getLocalBusinessSchema();
export const aboutPageSchema = getAboutPageSchema();
export const contactPageSchema = getContactPageSchema();
export const servicePricingSchema = getServicePricingSchema();
export const storeSchema = getStoreSchema();
export const blogIndexSchema = getBlogIndexSchema();
export const termsPageSchema = getTermsPageSchema();
