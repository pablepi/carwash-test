import { TenantConfig } from '@/types/tenant';

export const nord_detailing_config: TenantConfig = {
  slug: 'nord-detailing',
  name: 'Nord Detailing Studio',
  timezone: 'Europe/Moscow',
  address: 'г. Москва, ул. Примерная, д. 1',
  phone: '+7 (999) 000-00-00',
  coordinates: {
    lat: 55.751244,
    lng: 37.618423,
  },
  openingHour: '09:00',
  closingHour: '21:00',
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  workDays: [0, 1, 2, 3, 4, 5, 6],
  boxesCount: 2,
  heroTitle: 'Премиальный уход и детейлинг вашего автомобиля',
  heroSubtitle: 'Бережная 3-фазная мойка, полировка и керамическая защита ЛКП.',
  infoCards: [
    {
      title: 'Премиальная химия',
      desc: 'Только европейские биоразлагаемые составы с нейтральным pH.',
    },
    {
      title: 'Бережная сушка',
      desc: 'Бесконтактная турбосушка теплым фильтрованным воздухом.',
    },
    {
      title: 'Гарантия результата',
      desc: 'Контроль лакокрасочного покрытия под специализированным LED-освещением.',
    },
  ],
  services: [
    {
      id: 'cda72ca6-237b-4ff5-bd77-d39993490157',
      title: '3-фазная комплексная мойка',
      description: 'Бесконтактный состав, ручной шампунь, мойка дисков, сушка турбиной.',
      price: 3000,
      durationMinutes: 60,
      tags: ['3 фазы', 'Турбосушка', '60 мин'],
      category: 'wash',
    },
    {
      id: '9a7a2fe1-6d02-4f50-82a6-7deea5cd27f7',
      title: 'Защитное покрытие кварцем (Light Ceramic)',
      description: 'Очистка кузова глиной, обезжиривание и нанесение кварцевого силанта.',
      price: 8500,
      durationMinutes: 120,
      tags: ['Кварц', 'Гидрофоб', '120 мин'],
      category: 'protection',
    },
  ],
};
