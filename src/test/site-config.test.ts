import { describe, it, expect } from 'vitest';
import { SiteConfigSchema, defaultSiteConfig } from '../config/siteConfig';

describe('SiteConfigSchema & Single Source of Truth', () => {
  it('validates defaultSiteConfig successfully', () => {
    const result = SiteConfigSchema.safeParse(defaultSiteConfig);
    expect(result.success).toBe(true);
  });

  it('verifies default branding and contacts', () => {
    expect(defaultSiteConfig.branding.name).toBe('AquaDrive');
    expect(defaultSiteConfig.contacts.phone).toBeDefined();
    expect(defaultSiteConfig.workflow.boxesCount).toBeGreaterThanOrEqual(1);
  });

  it('verifies all 3 car categories are present with prices for each service', () => {
    expect(defaultSiteConfig.carCategories.map((c) => c.id)).toEqual(['sedan', 'crossover', 'suv']);

    for (const service of defaultSiteConfig.services) {
      expect(service.prices.sedan).toBeGreaterThan(0);
      expect(service.prices.crossover).toBeGreaterThanOrEqual(service.prices.sedan);
      expect(service.prices.suv).toBeGreaterThanOrEqual(service.prices.crossover);
      expect(service.durationMinutes).toBeGreaterThan(0);
    }
  });

  it('rejects config missing required fields', () => {
    const invalid = {
      branding: { name: 'Broken' },
    };
    const result = SiteConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid car category in carCategories list', () => {
    const invalid = {
      ...defaultSiteConfig,
      carCategories: [{ id: 'truck', name: 'Грузовик' }],
    };
    const result = SiteConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('allows adding and customizing services with all 3 category prices', () => {
    const custom = {
      ...defaultSiteConfig,
      services: [
        ...defaultSiteConfig.services,
        {
          id: 'vip-ceramic',
          name: 'Керамика кузова',
          description: 'Нанесение керамического покрытия',
          durationMinutes: 120,
          badge: 'Премиум',
          prices: {
            sedan: 10000,
            crossover: 12000,
            suv: 15000,
          },
        },
      ],
    };

    const result = SiteConfigSchema.safeParse(custom);
    expect(result.success).toBe(true);
  });

  it('validates workflow with opening/closing hours, buffer and slot interval', () => {
    expect(defaultSiteConfig.workflow.openingHour).toBe('08:00');
    expect(defaultSiteConfig.workflow.closingHour).toBe('22:00');
    expect(defaultSiteConfig.workflow.bufferMinutes).toBe(10);
    expect(defaultSiteConfig.workflow.slotStepMinutes).toBe(30);

    const customWorkflow = {
      ...defaultSiteConfig,
      workflow: {
        boxesCount: 4,
        openingHour: '09:00',
        closingHour: '21:00',
        bufferMinutes: 15,
        slotStepMinutes: 45,
      },
    };
    const parsed = SiteConfigSchema.safeParse(customWorkflow);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.workflow.openingHour).toBe('09:00');
      expect(parsed.data.workflow.bufferMinutes).toBe(15);
      expect(parsed.data.workflow.boxesCount).toBe(4);
    }
  });
});
