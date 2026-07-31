// Centralised JSON-LD structured data schemas injected via the SEO component's
// structuredData prop. Keeping them here avoids duplicating the LocalBusiness
// identity across pages and gives every public page a consistent, crawlable
// schema.org presence now that platform SEO generation is disabled.

const SITE_URL = "https://ontherunelectrics.com.au";

const BUSINESS = {
  name: "On The Run Electrics",
  description:
    "Electric scooter repairs, servicing and diagnostics in Woolloongabba, Brisbane. Open until midnight, seven days a week.",
  telephone: "+61415505908",
  email: "hello@ontherunelectrics.com.au",
  priceRange: "$$",
  areaServed: "Brisbane",
  address: {
    "@type": "PostalAddress",
    streetAddress: "11 Lucinda Street",
    addressLocality: "Woolloongabba",
    addressRegion: "QLD",
    postalCode: "4102",
    addressCountry: "AU",
  },
  openingHours: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "11:00",
      closes: "23:59",
    },
  ],
  services: [
    "Brake repairs",
    "Tyres and punctures",
    "Battery diagnostics",
    "Electrical fault finding",
    "General servicing",
    "Safety checks",
  ],
};

// Primary business schema — injected on the landing page and reused as a
// nested identifier on secondary pages so Google can associate every page
// with the one local business entity.
export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "AutoRepair",
  name: BUSINESS.name,
  description: BUSINESS.description,
  url: SITE_URL,
  telephone: BUSINESS.telephone,
  email: BUSINESS.email,
  priceRange: BUSINESS.priceRange,
  areaServed: BUSINESS.areaServed,
  address: BUSINESS.address,
  openingHoursSpecification: BUSINESS.openingHours,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Electric scooter services",
    itemListElement: BUSINESS.services.map((name) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name },
    })),
  },
};

export const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About On The Run Electrics",
  url: `${SITE_URL}/about`,
  mainEntity: {
    "@type": "AutoRepair",
    name: BUSINESS.name,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: BUSINESS.address,
    areaServed: BUSINESS.areaServed,
  },
};

export const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact On The Run Electrics",
  url: `${SITE_URL}/contact`,
  mainEntity: {
    "@type": "AutoRepair",
    name: BUSINESS.name,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: BUSINESS.address,
    openingHoursSpecification: BUSINESS.openingHours,
  },
};

export const servicePricingSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Electric scooter service pricing",
  url: `${SITE_URL}/service-pricing`,
  description:
    "Transparent pricing for electric scooter repairs, servicing and diagnostics at On The Run Electrics in Woolloongabba, Brisbane.",
  provider: {
    "@type": "AutoRepair",
    name: BUSINESS.name,
    telephone: BUSINESS.telephone,
    address: BUSINESS.address,
  },
};

export const storeSchema = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: `${BUSINESS.name} Parts Store`,
  url: `${SITE_URL}/store`,
  description:
    "Shop electric scooter parts, accessories and service items selected by On The Run Electrics for reliable repairs, servicing and maintenance.",
  telephone: BUSINESS.telephone,
  email: BUSINESS.email,
  address: BUSINESS.address,
  openingHoursSpecification: BUSINESS.openingHours,
};

export const blogIndexSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "On The Run Electrics News & Insights",
  url: `${SITE_URL}/blog`,
  description:
    "Practical advice, local rider news and stories from Brisbane's electric scooter specialists.",
  publisher: {
    "@type": "Organization",
    name: BUSINESS.name,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: BUSINESS.address,
  },
};

export const termsPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Terms & Conditions, Privacy Policy | On The Run Electrics",
  url: `${SITE_URL}/terms`,
  description:
    "Privacy policy, terms of service, terms of use, cookie and data handling statements for On The Run Electrics electric scooter repairs.",
  publisher: {
    "@type": "Organization",
    name: BUSINESS.name,
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: BUSINESS.address,
  },
};