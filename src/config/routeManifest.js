// @ts-check

export const ROUTE_ACCESS = Object.freeze({
  PUBLIC: "public",
  AUTHENTICATED: "authenticated",
  STAFF: "staff",
});

/**
 * Route metadata is intentionally data-only so CI can validate privacy and SEO
 * invariants without booting React or the Base44 SDK.
 */
export const ROUTE_MANIFEST = Object.freeze([
  { id: "landing", path: "/", page: "Landing", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "book", path: "/book", page: "BookAccount", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "about", path: "/about", page: "About", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "contact", path: "/contact", page: "Contact", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "terms", path: "/terms", page: "Terms", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "guest-booking", path: "/book/guest", page: "GuestBooking", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "store", path: "/store", page: "Store", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "service-pricing", path: "/service-pricing", page: "ServicePricing", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "blog-index", path: "/blog", page: "BlogIndex", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "blog-post", path: "/blog/:slug", page: "BlogPostPage", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "blog-category", path: "/blog/category/:slug", page: "BlogCategoryPage", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "blog-tag", path: "/blog/tag/:slug", page: "BlogTagPage", access: ROUTE_ACCESS.PUBLIC, indexable: true },
  { id: "login", path: "/login", page: "Login", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "register", path: "/register", page: "Register", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "forgot-password", path: "/forgot-password", page: "ForgotPassword", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "reset-password", path: "/reset-password", page: "ResetPassword", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "oauth-consent", path: "/oauth/consent", page: "OAuthConsent", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "feedback", path: "/feedback", page: "FeedbackRating", access: ROUTE_ACCESS.PUBLIC, indexable: false },
  { id: "public-track", path: "/track/:jobId", page: "PublicTrack", access: ROUTE_ACCESS.PUBLIC, indexable: false },

  { id: "profile-setup", path: "/profile-setup", page: "ProfileSetup", access: ROUTE_ACCESS.AUTHENTICATED, indexable: false },
  { id: "portal", path: "/portal", page: "PortalAccount", access: ROUTE_ACCESS.AUTHENTICATED, indexable: false },
  { id: "portal-settings", path: "/portal/settings", page: "PortalSettings", access: ROUTE_ACCESS.AUTHENTICATED, indexable: false },
  { id: "portal-account-redirect", path: "/portal/account", redirectTo: "/portal", access: ROUTE_ACCESS.AUTHENTICATED, indexable: false },

  { id: "dashboard", path: "/dashboard", page: "Overview", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "dashboard-jobs", path: "/dashboard/jobs", page: "Jobs", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "dashboard-calendar", path: "/dashboard/calendar", page: "Calendar", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "dashboard-invoices", path: "/dashboard/invoices", page: "Invoices", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "dashboard-parts", path: "/dashboard/parts", page: "Parts", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "dashboard-blog", path: "/dashboard/blog", page: "BlogDashboard", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "dashboard-blog-posts", path: "/dashboard/blog/posts", page: "BlogPosts", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "dashboard-blog-editor", path: "/dashboard/blog/posts/:id", page: "BlogEditor", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "dashboard-blog-generator", path: "/dashboard/blog/generate", page: "BlogGenerator", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "dashboard-blog-taxonomy", path: "/dashboard/blog/taxonomy", page: "BlogTaxonomy", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "dashboard-blog-settings", path: "/dashboard/blog/settings", page: "BlogSettings", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "dashboard-blog-logs", path: "/dashboard/blog/logs", page: "BlogLogs", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "settings", path: "/settings", page: "SystemSettings", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "settings-service-pricing", path: "/settings/service-pricing", page: "ServicePricingAdmin", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "settings-system-health", path: "/settings/system-health", page: "SystemHealth", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "asset-management", path: "/asset-management", page: "AssetManagement", access: ROUTE_ACCESS.STAFF, minRole: "admin", indexable: false },
  { id: "admin-feedback", path: "/admin/feedback", page: "AdminFeedback", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "admin-clients", path: "/admin/clients", page: "AdminClients", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "admin-activity", path: "/admin/activity", page: "AdminActivityLog", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "customers-redirect", path: "/customers", redirectTo: "/admin/clients", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "job-board-redirect", path: "/job-board", redirectTo: "/dashboard/jobs", access: ROUTE_ACCESS.STAFF, indexable: false },
  { id: "parts-catalogue-redirect", path: "/parts-catalogue", redirectTo: "/dashboard/parts", access: ROUTE_ACCESS.STAFF, indexable: false },
]);

export function routesFor(access) {
  return ROUTE_MANIFEST.filter((route) => route.access === access);
}

export const INDEXABLE_STATIC_PATHS = Object.freeze(
  ROUTE_MANIFEST.filter((route) => route.indexable && !route.path.includes(":"))
    .map((route) => route.path),
);
