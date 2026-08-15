import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const PUBLIC_ORIGIN = 'https://ontherunelectrics.com.au';
const TERMINOLOGY_KEYS = [
  'platformLabel', 'jobSingular', 'jobPlural', 'customerSingular',
  'assetSingular', 'assetPlural', 'serviceRequestLabel', 'readyStateLabel',
  'operationalAreaLabel',
];
const LANDING_TEXT_KEYS = [
  'heroEyebrow', 'servicesEyebrow', 'servicesTitle', 'servicesBody',
  'journeyEyebrow', 'journeyTitle', 'journeyBody', 'portalLabel',
];
const DASHBOARD_NAV_KEYS = ['overview', 'jobs', 'calendar'];
const DASHBOARD_METRIC_KEYS = [
  'active', 'awaitingCustomer', 'waitingParts', 'readyPickup', 'outstanding',
  'completedWeek', 'requested', 'total',
];

function clean(value: unknown, maxLength = 2000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeHttpsUrl(value: unknown, maxLength = 1000) {
  const raw = clean(value, maxLength);
  if (!raw || /[\\\u0000-\u0020\u007f]/.test(raw)) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    return clean(url.toString(), maxLength);
  } catch {
    return '';
  }
}

function safeNavigationHref(value: unknown) {
  const raw = clean(value, 1000);
  if (!raw || /[\\\u0000-\u0020\u007f]/.test(raw)) return '';
  if (raw.startsWith('#')) {
    return /^#[A-Za-z][A-Za-z0-9:._-]{0,79}$/.test(raw) ? raw : '';
  }
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    try {
      const url = new URL(raw, PUBLIC_ORIGIN);
      return url.origin === PUBLIC_ORIGIN && !url.username && !url.password
        ? `${url.pathname}${url.search}${url.hash}`
        : '';
    } catch {
      return '';
    }
  }
  return safeHttpsUrl(raw);
}

function textRecord(value: unknown, keys: string[], maxLength = 1000) {
  const source = record(value);
  return Object.fromEntries(keys.flatMap((key) => {
    const text = clean(source[key], maxLength);
    return text ? [[key, text]] : [];
  }));
}

function publicAppDto(value: unknown) {
  const app = record(value);
  const landing = record(app.landing);
  const dashboard = record(app.dashboard);
  const navLinks = Array.isArray(landing.navLinks)
    ? landing.navLinks.slice(0, 20).flatMap((entry) => {
      const link = record(entry);
      const label = clean(link.label, 120);
      const href = safeNavigationHref(link.href);
      return label && href ? [{ label, href }] : [];
    })
    : [];
  const heroBenefits = Array.isArray(landing.heroBenefits)
    ? landing.heroBenefits.slice(0, 12).map((item) => clean(item, 160)).filter(Boolean)
    : [];
  return {
    terminology: textRecord(app.terminology, TERMINOLOGY_KEYS, 160),
    landing: {
      ...textRecord(landing, LANDING_TEXT_KEYS, 5000),
      ...(heroBenefits.length ? { heroBenefits } : {}),
      ...(navLinks.length ? { navLinks } : {}),
    },
    dashboard: {
      ...textRecord(dashboard, ['overviewSubtitle'], 1000),
      nav: textRecord(dashboard.nav, DASHBOARD_NAV_KEYS, 160),
      metrics: textRecord(dashboard.metrics, DASHBOARD_METRIC_KEYS, 160),
    },
  };
}

function profileDto(profile: any) {
  if (!profile) return null;
  return {
    name: clean(profile.name, 160), legal_name: clean(profile.legal_name, 200), tagline: clean(profile.tagline, 300), subheading: clean(profile.subheading, 1000),
    website_url: safeHttpsUrl(profile.website_url, 500), email: clean(profile.email, 320), phone: clean(profile.phone, 80), phone_e164: clean(profile.phone_e164, 40),
    address: clean(profile.address, 500), address_line_1: clean(profile.address_line_1, 240), locality: clean(profile.locality, 120), region: clean(profile.region, 80),
    postcode: clean(profile.postcode, 20), country: clean(profile.country || 'AU', 8), maps_url: safeHttpsUrl(profile.maps_url, 1000), abn: clean(profile.abn, 40),
    locations: (profile.locations || []).slice(0, 20).map((row: any) => ({ name: clean(row.name, 160), address: clean(row.address, 500), phone: clean(row.phone, 80), email: clean(row.email, 320), is_default: row.is_default === true })),
    opening_hours: (profile.opening_hours || []).slice(0, 14).map((row: any) => ({ day: clean(row.day, 80), hours: clean(row.hours, 120), opens: clean(row.opens, 20), closes: clean(row.closes, 20) })),
    currency: clean(profile.currency || 'AUD', 12), timezone: clean(profile.timezone || 'Australia/Brisbane', 80),
  };
}

function serviceDto(service: any) {
  return { id: service.id, name: clean(service.name, 200), category: clean(service.category, 120), category_key: clean(service.category_key, 120), description: clean(service.description, 3000), icon: clean(service.icon, 80), price: Number(service.price || 0), order: Number(service.order || 0) };
}

function categoryDto(category: any) {
  return { id: category.id, key: clean(category.key, 120), name: clean(category.name, 200), description: clean(category.description, 3000), icon: clean(category.icon, 80), order: Number(category.order || 0) };
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return Response.json({ ok: false, error: { code: 'method_not_allowed', message: 'Use POST for this action.' } }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const [profiles, services, categories, settings] = await Promise.all([
      base44.asServiceRole.entities.BusinessProfile.filter({ is_default: true }, '-updated_date', 1).catch(() => []),
      base44.asServiceRole.entities.ServiceItem.filter({ active: true }, 'order', 100).catch(() => []),
      base44.asServiceRole.entities.ServiceCategory.filter({ active: true }, 'order', 100).catch(() => []),
      base44.asServiceRole.entities.AppSetting.filter({ active: true }, 'key', 100).catch(() => []),
    ]);
    const appSetting = settings.find((item: any) => item.key === 'app');
    const app = appSetting ? { app: publicAppDto(appSetting.value) } : {};
    return Response.json({ ok: true, data: { business: profileDto(profiles[0]), services: services.map(serviceDto), categories: categories.map(categoryDto), settings: app } });
  } catch (error) {
    console.error('[publicSiteConfig]', clean(error?.message || error, 500));
    return Response.json({ ok: false, error: { code: 'site_config_unavailable', message: 'Public business details are temporarily unavailable.' } }, { status: 500 });
  }
});
