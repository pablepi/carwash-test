import { describe, it, expect } from 'vitest';
import { TenantConfigSchema } from '../types/tenant';
import { apexTenantConfig } from '../../tenants/apex-detailing/config';

describe('Tenant Configuration Schema Validation', () => {
  it('validates apex tenant config successfully', () => {
    const result = TenantConfigSchema.safeParse(apexTenantConfig);
    expect(result.success).toBe(true);
  });

  it('rejects invalid slug with uppercase or special characters', () => {
    const invalid = { ...apexTenantConfig, slug: 'Apex_Bad!123' };
    const result = TenantConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects invalid timezone', () => {
    const invalid = { ...apexTenantConfig, timezone: 'Moon/Base_Alpha' };
    const result = TenantConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires exactly 3 info cards', () => {
    const invalid = { ...apexTenantConfig, infoCards: [{ title: 'One', desc: 'Desc one' }] };
    const result = TenantConfigSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates that all services have positive duration and price', () => {
    for (const svc of apexTenantConfig.services) {
      expect(svc.durationMinutes).toBeGreaterThan(0);
      expect(svc.price).toBeGreaterThanOrEqual(0);
    }
  });

  it('confirms all services are quick car-wash slots (≤ 120 min)', () => {
    for (const svc of apexTenantConfig.services) {
      expect(svc.durationMinutes).toBeLessThanOrEqual(120);
    }
  });
});
