import React from 'react';
import { CalendarPlus, MapPin, Clock } from '@phosphor-icons/react';
import { LiquidGlass } from '../common/LiquidGlass';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { TenantConfig } from '@/types/tenant';

interface HeroSectionProps {
  tenant?: TenantConfig;
  onBookClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ tenant: propTenant, onBookClick }) => {
  const { config } = useSiteConfig();

  const title = config.branding.heroTitle || propTenant?.heroTitle || 'Бережная мойка без царапин и разводов';
  const subtitle = config.branding.heroSubtitle || propTenant?.heroSubtitle || 'Профессиональная химия, умягчённая вода и турбосушка.';
  const name = config.branding.name || propTenant?.name || 'AquaDrive';
  const heroImage = config.branding.heroImageUrl || (propTenant as any)?.heroImage || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80';
  const address = config.contacts.address || propTenant?.address || 'г. Москва, ул. Автозаводская, д. 23';
  const hours = config.contacts.workingHours || `${propTenant?.openingHour || '08:00'} – ${propTenant?.closingHour || '22:00'}`;

  return (
    <section className="relative w-full overflow-hidden bg-[#000000] pt-3 pb-8 sm:pt-6 sm:pb-12">
      <div className="mx-auto max-w-5xl px-3 sm:px-6">
        <div className="relative w-full min-h-[420px] sm:min-h-[460px] md:min-h-[480px] aspect-[4/5] sm:aspect-[16/10] md:aspect-[21/9] overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#161618] shadow-2xl">
          {/* Background photo */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
            style={{
              backgroundImage: `url('${heroImage}')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/70 to-black/25" />
          </div>

          {/* Top metadata badge - single non-wrapping row */}
          <div className="absolute top-3.5 left-3 right-3 z-20 flex items-center justify-between gap-2 flex-nowrap">
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 text-[#F5F5F7] text-[11px] sm:text-xs min-w-0 max-w-[65%]">
              <MapPin size={13} className="text-accent-blue shrink-0" weight="bold" />
              <span className="truncate">{address}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 text-[#F5F5F7] text-[11px] sm:text-xs shrink-0 font-sans">
              <Clock size={13} className="text-accent-blue shrink-0" weight="bold" />
              <span className="font-sans font-medium">{hours}</span>
            </div>
          </div>

          {/* Hero Content anchored safely inside the container with top clearance */}
          <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-8 pt-16 flex flex-col items-start justify-end">
            <span className="text-[11px] font-sans uppercase tracking-widest text-accent-blue font-semibold mb-1.5">
              {name}
            </span>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#F5F5F7] leading-[1.15] max-w-2xl mb-2 sm:mb-3">
              {title}
            </h1>

            <p className="text-xs sm:text-sm text-[#A1A1A6] max-w-lg mb-5 sm:mb-6 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {subtitle}
            </p>

            {/* Liquid Glass Action Trigger Button */}
            <div className="w-full sm:w-auto">
              <button
                onClick={onBookClick}
                className="group relative inline-flex w-full sm:w-auto items-center justify-center font-sans font-semibold tracking-tight transition-all duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <LiquidGlass
                  rounded="rounded-2xl"
                  className="w-full transition-all duration-200 group-hover:border-accent-blue/50 shadow-[0_0_24px_-4px_var(--apple-accent-blue)]"
                >
                  <div className="flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm sm:text-base select-none">
                    <CalendarPlus size={20} weight="bold" className="text-accent-blue shrink-0" />
                    <span className="font-semibold tracking-tight text-[#FFFFFF]">
                      Записаться на мойку
                    </span>
                  </div>
                </LiquidGlass>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
