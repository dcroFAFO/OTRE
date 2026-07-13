import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_BUSINESS,
  DEFAULT_SERVICES,
} from "@/config/platformConfig";

function toBusiness(profile) {
  if (!profile) return DEFAULT_BUSINESS;
  return {
    ...DEFAULT_BUSINESS,
    ...profile,
    legalName: profile.legal_name || profile.legalName || DEFAULT_BUSINESS.legalName,
    openingHours: profile.opening_hours || profile.openingHours || DEFAULT_BUSINESS.openingHours,
    primaryCta: DEFAULT_BUSINESS.primaryCta,
    secondaryCta: DEFAULT_BUSINESS.secondaryCta,
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
        app: { ...DEFAULT_APP_SETTINGS, ...(settings.app || {}) },
      };
    },
    initialData: {
      business: DEFAULT_BUSINESS,
      services: DEFAULT_SERVICES,
      app: DEFAULT_APP_SETTINGS,
    },
    staleTime: 5 * 60 * 1000, // 5 minutes — config rarely changes
    gcTime: 10 * 60 * 1000,
  });
}