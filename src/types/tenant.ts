import { z } from 'zod';

export const InfoCardSchema = z.object({
  title: z.string().min(2).max(50),
  desc: z.string().min(5).max(180),
});

export const TenantConfigSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
  name: z.string().min(2).max(100),
  timezone: z.string().refine((tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid IANA timezone (e.g. Europe/Moscow)'),
  address: z.string().min(5),
  phone: z.string().min(10),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  openingHour: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:mm (e.g. 08:00)'),
  closingHour: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:mm (e.g. 22:00)'),
  slotIntervalMinutes: z.number().int().min(15).max(120).default(30),
  bufferMinutes: z.number().int().min(0).max(120).default(15),
  workDays: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]), // 0 = Sunday, 1 = Monday
  boxesCount: z.number().int().min(1).max(20).default(3),
  heroTitle: z.string().min(5).max(100),
  heroSubtitle: z.string().min(10).max(250),
  infoCards: z.array(InfoCardSchema).length(3, 'Exactly 3 info cards required for landing balance'),
  services: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(2),
      description: z.string(),
      price: z.number().min(0),
      durationMinutes: z.number().int().min(15),
      tags: z.array(z.string()),
      category: z.enum(['wash', 'detailing', 'protection', 'interior']),
    })
  ).min(1, 'At least one service is required'),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;
export type InfoCard = z.infer<typeof InfoCardSchema>;
