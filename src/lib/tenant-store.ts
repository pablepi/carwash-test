import { useMemo, useCallback } from 'react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { TenantConfig } from '@/types/tenant';
import { SiteConfig, CarCategoryId } from '@/config/siteConfig';

export interface ExtendedTenantConfig extends TenantConfig {
  accentColor?: string;
  heroImage?: string;
  tagline?: string;
  carCategories?: SiteConfig['carCategories'];
  siteConfig?: SiteConfig;
}

/**
 * Adapter converting modern SiteConfig to legacy TenantConfig structure
 */
export const siteConfigToTenant = (
  site: SiteConfig,
  category: CarCategoryId = 'sedan'
): ExtendedTenantConfig => {
  // Use explicit workflow hours, with fallback to parsing workingHours string
  let openingHour = site.workflow.openingHour || '08:00';
  let closingHour = site.workflow.closingHour || '22:00';
  if (!site.workflow.openingHour || !site.workflow.closingHour) {
    const match = site.contacts.workingHours.match(/(\d{2}:\d{2})\s*[—–-]\s*(\d{2}:\d{2})/);
    if (match) {
      openingHour = match[1];
      closingHour = match[2];
    }
  }

  return {
    slug: 'aquadrive',
    name: site.branding.name,
    timezone: 'Europe/Moscow',
    address: site.contacts.address,
    phone: site.contacts.phone,
    openingHour,
    closingHour,
    slotIntervalMinutes: site.workflow.slotStepMinutes,
    bufferMinutes: site.workflow.bufferMinutes,
    workDays: [0, 1, 2, 3, 4, 5, 6],
    boxesCount: site.workflow.boxesCount,
    heroTitle: site.branding.heroTitle,
    heroSubtitle: site.branding.heroSubtitle,
    heroImage: site.branding.heroImageUrl,
    accentColor: site.theme.accentColor,
    tagline: site.branding.tagline,
    carCategories: site.carCategories,
    siteConfig: site,
    infoCards: [
      {
        title: 'Умягчённая вода',
        desc: 'Фильтрация и обратный осмос: никаких белых разводов и солевых пятен на кузове после мойки.',
      },
      {
        title: 'Бесконтактная сушка',
        desc: 'Турбосушка тёплым воздухом из всех щелей, зеркал и оптики — без царапающих тряпок.',
      },
      {
        title: 'Чистая зона ожидания',
        desc: 'Бесплатный Wi-Fi, кофе и прямая трансляция из бокса, пока ваш автомобиль моется.',
      },
    ],
    services: site.services.map((svc) => ({
      id: svc.id,
      title: svc.name,
      description: svc.description,
      price: svc.prices[category] || svc.prices.sedan,
      durationMinutes: svc.durationMinutes,
      tags: [svc.badge || 'Мойка', `${svc.durationMinutes} мин`],
      category: 'wash' as const,
    })),
  };
};

/**
 * Hook providing backwards-compatible TenantConfig synced with SiteConfig Single Source of Truth
 */
export const useTenantConfig = () => {
  const { config, updateConfig: updateSiteConfig, resetConfig: resetSiteConfig, selectedCarCategory } = useSiteConfig();

  const tenantConfig = useMemo(() => {
    return siteConfigToTenant(config, selectedCarCategory);
  }, [config, selectedCarCategory]);

  const updateConfig = useCallback(
    (updates: Partial<ExtendedTenantConfig>) => {
      updateSiteConfig((prev) => {
        const next = { ...prev };
        if (updates.name) next.branding.name = updates.name;
        if (updates.heroTitle) next.branding.heroTitle = updates.heroTitle;
        if (updates.heroSubtitle) next.branding.heroSubtitle = updates.heroSubtitle;
        if (updates.heroImage) next.branding.heroImageUrl = updates.heroImage;
        if (updates.accentColor) next.theme.accentColor = updates.accentColor;
        if (updates.boxesCount !== undefined) next.workflow.boxesCount = updates.boxesCount;
        if (updates.openingHour) next.workflow.openingHour = updates.openingHour;
        if (updates.closingHour) next.workflow.closingHour = updates.closingHour;
        if (updates.slotIntervalMinutes !== undefined) next.workflow.slotStepMinutes = updates.slotIntervalMinutes;
        if (updates.bufferMinutes !== undefined) next.workflow.bufferMinutes = updates.bufferMinutes;
        if (updates.address) next.contacts.address = updates.address;
        if (updates.phone) next.contacts.phone = updates.phone;
        return next;
      });
    },
    [updateSiteConfig]
  );

  return {
    config: tenantConfig,
    siteConfig: config,
    updateConfig,
    resetConfig: resetSiteConfig,
  };
};
