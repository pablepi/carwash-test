import { z } from 'zod';

export const SiteConfigSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string(),
    faviconUrl: z.string().optional(),
  }),
  branding: z.object({
    name: z.string(), // "AquaDrive"
    tagline: z.string(), // "Быстрая мойка кузова и салона без очередей"
    heroTitle: z.string(),
    heroSubtitle: z.string(),
    heroImageUrl: z.string(),
    logoUrl: z.string().optional(),
  }),
  theme: z.object({
    accentColor: z.string(), // Дефолт: "#10B981" (изумрудный мятный)
    accentHover: z.string(), // "#059669"
    textColor: z.string().default('#F5F5F7'), // Светлый контрастный Apple-стиль
    bgBase: z.string().default('#000000'), // Глубокий черный фон
    cardBg: z.string().default('#161618'), // Фон плашек
  }),
  contacts: z.object({
    city: z.string(),
    address: z.string(),
    phone: z.string(), // "+7 (999) 000-00-00"
    workingHours: z.string(), // "Ежедневно: 08:00 — 22:00"
    yandexMapsUrl: z.string(), // Ссылка на маршрут в навигаторе
    telegramUrl: z.string().optional(),
    whatsappUrl: z.string().optional(),
    maxUrl: z.string().optional(), // Мессенджер MAX
  }),
  workflow: z.object({
    boxesCount: z.number().min(1).default(2), // Количество боксов (например, 2)
    openingHour: z.string().default('08:00'), // Время начала работы (свободно с)
    closingHour: z.string().default('22:00'), // Время окончания работы (свободно до)
    slotStepMinutes: z.number().default(30), // Шаг сетки (15, 30, 45 или 60 мин)
    bufferMinutes: z.number().default(10), // Технический перерыв между авто (0, 5, 10, 15, 20 мин)
  }),
  carCategories: z.array(
    z.object({
      id: z.enum(['sedan', 'crossover', 'suv']),
      name: z.string(), // "Легковая", "Кроссовер", "Внедорожник"
    })
  ),
  services: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      durationMinutes: z.number(),
      badge: z.string().optional(), // "Хит", "Экспресс", "Комплекс"
      prices: z.object({
        sedan: z.number(),
        crossover: z.number(),
        suv: z.number(),
      }),
    })
  ),
  gallery: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      caption: z.string().optional(),
    })
  ),
});

export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type CarCategoryId = 'sedan' | 'crossover' | 'suv';
export type ServiceItemConfig = SiteConfig['services'][number];

/**
 * Default White-Label Site Configuration for modern car wash
 * Edit this object to customize the whole site in 2 minutes.
 */
export const defaultSiteConfig: SiteConfig = {
  meta: {
    title: 'AquaDrive — Онлайн-запись на автомойку',
    description: 'Быстрая мойка кузова и салона без очередей. Запись за 30 секунд.',
    faviconUrl: '/favicon.svg',
  },
  branding: {
    name: 'AquaDrive',
    tagline: 'Быстрая мойка кузова и салона без очередей',
    heroTitle: 'Бережная мойка без царапин и разводов',
    heroSubtitle: 'Профессиональная химия, умягчённая вода и турбосушка тёплым воздухом — без контакта жёстких тряпок с кузовом.',
    heroImageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80',
    logoUrl: '/favicon.svg',
  },
  theme: {
    accentColor: '#10B981',
    accentHover: '#059669',
    textColor: '#F5F5F7',
    bgBase: '#000000',
    cardBg: '#161618',
  },
  contacts: {
    city: 'Москва',
    address: 'г. Москва, ул. Автозаводская, д. 23, корп. 7',
    phone: '+7 (999) 000-00-00',
    workingHours: 'Ежедневно: 08:00 — 22:00',
    yandexMapsUrl: 'https://yandex.ru/maps/-/CDuWvQ12',
    telegramUrl: 'https://t.me/aquadrive_wash',
    whatsappUrl: 'https://wa.me/79990000000',
    maxUrl: 'https://max.ru/aquadrive',
  },
  workflow: {
    boxesCount: 2,
    openingHour: '08:00',
    closingHour: '22:00',
    slotStepMinutes: 30,
    bufferMinutes: 10,
  },
  carCategories: [
    { id: 'sedan', name: 'Легковая' },
    { id: 'crossover', name: 'Кроссовер' },
    { id: 'suv', name: 'Внедорожник' },
  ],
  services: [
    {
      id: 'express-wash',
      name: 'Экспресс-мойка',
      description: 'Бесконтактная мойка кузова активной пеной, ополаскивание умягчённой водой, турбосушка.',
      durationMinutes: 30,
      badge: 'Экспресс',
      prices: {
        sedan: 800,
        crossover: 950,
        suv: 1100,
      },
    },
    {
      id: 'standard-complex',
      name: 'Комплекс (кузов + салон)',
      description: 'Двухфазная мойка кузова, пылесос салона и багажника, влажная уборка пластика, мойка стекол изнутри, чернение шин.',
      durationMinutes: 60,
      badge: 'Хит',
      prices: {
        sedan: 1600,
        crossover: 1900,
        suv: 2200,
      },
    },
    {
      id: 'nano-wash',
      name: 'Трёхфазная нано-мойка',
      description: 'Бесконтактная фаза, ручная фаза нейтральным шампунем с губкой, кварцевое гидрофобное покрытие, турбосушка.',
      durationMinutes: 60,
      badge: 'Комплекс',
      prices: {
        sedan: 2400,
        crossover: 2800,
        suv: 3200,
      },
    },
    {
      id: 'interior-cleaning',
      name: 'Химчистка сидений',
      description: 'Глубокая экстракторная чистка сидений, удаление пятен и запахов, антибактериальная обработка.',
      durationMinutes: 90,
      badge: 'Салон',
      prices: {
        sedan: 3500,
        crossover: 4000,
        suv: 4500,
      },
    },
    {
      id: 'engine-wash',
      name: 'Мойка двигателя',
      description: 'Деликатная мойка подкапотного пространства паром и диэлектрическим гелем, продувка контактов.',
      durationMinutes: 45,
      badge: 'Двигатель',
      prices: {
        sedan: 1800,
        crossover: 2100,
        suv: 2400,
      },
    },
  ],
  gallery: [
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80',
      caption: 'Бесконтактная активная пена',
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80',
      caption: 'Турбосушка тёплым воздухом',
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80',
      caption: 'Химчистка и кондиционирование салона',
    },
  ],
};
