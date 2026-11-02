import React from 'react';
import { CalendarPlus, MapPin, Clock } from '@phosphor-icons/react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { TenantConfig } from '@/types/tenant';

interface HeroSectionProps {
  tenant?: TenantConfig;
  onBookClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ tenant: propTenant, onBookClick }) => {
  const { config } = useSiteConfig();

  const title = config.branding.heroTitle || propTenant?.heroTitle || 'Мойка кузова и салона без очередей';
  const subtitle = config.branding.heroSubtitle || propTenant?.heroSubtitle || '3 оборудованных бокса, теплая вода и сушка турбовоздухом. Заезд строго к выбранному времени за 30 секунд.';
  const heroImage = config.branding.heroImageUrl || (propTenant as any)?.heroImage || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80';
  const address = config.contacts.address || propTenant?.address || 'г. Москва, ул. Автозаводская, д. 23';
  const hours = config.contacts.workingHours || `${propTenant?.openingHour || '08:00'} – ${propTenant?.closingHour || '22:00'}`;

  return (
    <section className="relative w-full overflow-hidden bg-[#0A0A0C] pt-3 pb-8 sm:pt-6 sm:pb-12">
      <div className="mx-auto max-w-5xl px-3 sm:px-6">
        <div className="relative w-full min-h-[420px] sm:min-h-[460px] md:min-h-[480px] aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/9] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#141416]">
          {/* Background photograph with dark overlay scrim */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${heroImage}')`,
            }}
          >
            <div className="absolute inset-0 bg-black/75" />
          </div>

          {/* Top metadata - plain bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 flex-nowrap">
            <div className="flex items-center gap-1.5 rounded-xl bg-[#141416]/90 px-3.5 py-1.5 border border-white/10 text-white text-xs min-w-0 max-w-[65%]">
              <MapPin size={13} className="text-accent-blue shrink-0" weight="bold" />
              <span className="truncate font-medium">{address}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-[#141416]/90 px-3.5 py-1.5 border border-white/10 text-white text-xs shrink-0">
              <Clock size={13} className="text-accent-blue shrink-0" weight="bold" />
              <span className="font-medium tabular-nums">{hours}</span>
            </div>
          </div>

          {/* Hero Content anchored directly */}
          <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-8 pt-16 flex flex-col items-start justify-end">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-[1.05] max-w-2xl mb-3">
              {title}
            </h1>

            <p className="text-sm sm:text-base text-[#D1D1D6] max-w-xl mb-6 leading-relaxed">
              {subtitle}
            </p>

            {/* Flat primary action button named for its action */}
            <button
              onClick={onBookClick}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-accent-blue text-black font-bold text-sm sm:text-base hover:bg-accent-blue-hover transition-transform duration-100 ease-out active:scale-[0.965] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CalendarPlus size={20} weight="bold" className="shrink-0" />
              <span>Записаться на мойку</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
