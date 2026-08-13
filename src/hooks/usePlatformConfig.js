import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BUSINESS,
  DEFAULT_SERVICES,
} from "@/config/platformConfig";

export function toBusiness(profile) {
  if (!profile) return DEFAULT_BUSINESS;
  return {
    ...DEFAULT_BUSINESS,
    ...profile,
    name: profile.name || profile.business_name || DEFAULT_BUSINESS.name,
    legalName: profile.legal_name || profile.legalName || DEFAULT_BUSINESS.legalName,
    websiteUrl: profile.website_url || profile.websiteUrl || DEFAULT_BUSINESS.websiteUrl,
    email: profile.email || profile.contact_email || DEFAULT_BUSINESS.email,
    phone: profile.phone || profile.contact_phone || DEFAULT_BUSINESS.phone,
    address: profile.address || profile.business_address || DEFAULT_BUSINESS.address,
    phoneE164: profile.phone_e164 || profile.phoneE164 || DEFAULT_BUSINESS.phoneE164,
    addressLine1: profile.address_line_1 || profile.addressLine1 || DEFAULT_BUSINESS.addressLine1,
    locality: profile.locality || DEFAULT_BUSINESS.locality,
    region: profile.region || DEFAULT_BUSINESS.region,
    postcode: profile.postcode || DEFAULT_BUSINESS.postcode,
    country: profile.country || DEFAULT_BUSINESS.country,
    abn: profile.abn || DEFAULT_BUSINESS.abn,
    mapsUrl: profile.maps_url || profile.mapsUrl || "",
    openingHours: profile.opening_hours || profile.openingHours || DEFAULT_BUSINESS.openingHours,
    primaryCta: DEFAULT_BUSINESS.primaryCta,
    secondaryCta: DEFAULT_BUSINESS.secondaryCta,
  };
}

export function toAppSettings(settings) {
  const configured = settings?.app || {};
  const configuredLanding = configured.landing || {};
  const configuredLinks = Array.isArray(configuredLanding.navLinks) ? configuredLanding.navLinks : [];
  const requiredRoutes = ["/about", "/service-pricing", "/blog", "/contact", "/book"];
  const hasPersistentNavigation = requiredRoutes.every((route) => configuredLinks.some((link) => link?.href === route));
  return {
    ...DEFAULT_APP_SETTINGS,
    ...configured,
    landing: {
      ...DEFAULT_APP_SETTINGS.landing,
      ...configuredLanding,
      navLinks: hasPersistentNavigation ? configuredLinks : DEFAULT_APP_SETTINGS.landing.navLinks,
    },
  };
}

export function usePlatformConfig() {
  return useQuery({
    queryKey: ["platformConfig"],
    queryFn: async () => {
      const [profiles, services, appSettings] = await Promise.all([
        base44.entities.BusinessProfile.filter({ is_default: true }, "", 1),
        base44.entities.ServiceItem.filter({ active: true }, "order", 100),
        base44.entities.AppSetting.filter({ active: true }, "", 100),
      ]);

      const settings = appSettings.reduce((acc, item) => ({ ...acc, [item.key]: item.value }), {});
      const configuredServices = services.length
        ? services.map((service) => ({
            ...DEFAULT_SERVICES.find((item) => item.name === service.name),
            ...service,
          }))
        : DEFAULT_SERVICES;

      return {
        business: toBusiness(profiles[0]),
        services: configuredServices,
        app: toAppSettings(settings),
      };
    },
    initialData: {
      business: DEFAULT_BUSINESS,
      services: DEFAULT_SERVICES,
      app: DEFAULT_APP_SETTINGS,
    },
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000, // 5 minutes — config rarely changes
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always",
  });
}
