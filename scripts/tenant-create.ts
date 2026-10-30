import fs from 'fs';
import path from 'path';

const slug = process.argv[2];

if (!slug) {
  console.error('\x1b[31m[ERROR] Please provide a tenant slug. Example: pnpm tenant:create nord-detailing\x1b[0m');
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error('\x1b[31m[ERROR] Tenant slug must be lowercase alphanumeric with hyphens only.\x1b[0m');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), 'tenants', slug);

if (fs.existsSync(targetDir)) {
  console.error(`\x1b[31m[ERROR] Tenant directory already exists: ${targetDir}\x1b[0m`);
  process.exit(1);
}

fs.mkdirSync(path.join(targetDir, 'assets', 'gallery'), { recursive: true });

const templateConfig = `import { TenantConfig } from '@/types/tenant';

export const ${slug.replace(/-/g, '_')}_config: TenantConfig = {
  slug: '${slug}',
  name: '${slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')} Автомойка',
  timezone: 'Europe/Moscow',
  address: 'г. Москва, ул. Примерная, д. 1',
  phone: '+7 (999) 000-00-00',
  coordinates: {
    lat: 55.751244,
    lng: 37.618423,
  },
  openingHour: '08:00',
  closingHour: '22:00',
  slotIntervalMinutes: 30,
  bufferMinutes: 10,
  workDays: [0, 1, 2, 3, 4, 5, 6],
  boxesCount: 3,
  heroTitle: 'Быстрая и бережная мойка вашего авто',
  heroSubtitle: 'Умягчённая вода, бесконтактная пена и турбосушка без царапин.',
  infoCards: [
    {
      title: 'Умягчённая вода',
      desc: 'Очистка воды через обратный осмос — отсутствие белых разводов и налёта.',
    },
    {
      title: 'Турбосушка воздухом',
      desc: 'Сушка тёплым направленным потоком — без контакта тряпок с ЛКП.',
    },
    {
      title: 'Комфортное ожидание',
      desc: 'Зона отдыха с бесплатным кофе, Wi-Fi и мониторами с видом на боксы.',
    },
  ],
  services: [
    {
      id: '${crypto.randomUUID()}',
      title: 'Экспресс-мойка кузова',
      description: 'Бесконтактная пена, мойка кузова и колесных арок, сушка турбиной.',
      price: 800,
      durationMinutes: 30,
      tags: ['Кузов', '30 мин', 'Экспресс'],
      category: 'wash',
    },
    {
      id: '${crypto.randomUUID()}',
      title: 'Комплекс (кузов + салон)',
      description: '2-фазная мойка, влажная уборка салона, пылесос, мойка ковриков и стекол.',
      price: 1500,
      durationMinutes: 60,
      tags: ['Комплекс', 'Салон', '60 мин'],
      category: 'wash',
    },
    {
      id: '${crypto.randomUUID()}',
      title: 'Трехфазная наномойка',
      description: 'Первичный состав, ручной нейтральный шампунь, гидрофобный воск и продувка щелей.',
      price: 2200,
      durationMinutes: 60,
      tags: ['3 фазы', 'Нано', 'Гидрофоб'],
      category: 'wash',
    },
  ],
};
`;

fs.writeFileSync(path.join(targetDir, 'config.ts'), templateConfig, 'utf-8');

const sampleLogoSvg = `<svg width="240" height="48" viewBox="0 0 240 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="16" stroke="#4690FF" stroke-width="3"/>
  <text x="50" y="30" fill="#F9FAFB" font-family="Inter, sans-serif" font-weight="700" font-size="18">${slug.toUpperCase()}</text>
</svg>`;

fs.writeFileSync(path.join(targetDir, 'assets', 'logo.svg'), sampleLogoSvg, 'utf-8');

console.log(`\x1b[32m[SUCCESS] Tenant scaffolded successfully at:\x1b[0m ${targetDir}`);
console.log(`\x1b[36mNext steps:\x1b[0m Edit tenants/${slug}/config.ts, add assets, and run pnpm tenant:validate ${slug}`);
