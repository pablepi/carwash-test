import React from 'react';
import { MapPin, Phone, Clock, ArrowUpRight, TelegramLogo, ChatCircleDots } from '@phosphor-icons/react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { TenantConfig } from '@/types/tenant';

interface FooterProps {
  tenant?: TenantConfig;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ tenant: propTenant, className = '' }) => {
  const { config } = useSiteConfig();
  const currentYear = new Date().getFullYear();

  const name = config.branding.name || propTenant?.name || 'AquaDrive';
  const phone = config.contacts.phone || propTenant?.phone || '+7 (999) 000-00-00';
  const cleanPhone = phone.replace(/[^+\d]/g, '');
  const address = config.contacts.address || propTenant?.address || 'г. Москва, ул. Автозаводская, д. 23';
  const hours = config.contacts.workingHours || `Ежедневно ${propTenant?.openingHour || '08:00'} – ${propTenant?.closingHour || '22:00'}`;
  const yandexUrl = config.contacts.yandexMapsUrl || `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
  const telegramUrl = config.contacts.telegramUrl || 'https://t.me';
  const maxUrl = (config.contacts as any).maxUrl || config.contacts.whatsappUrl || 'https://max.ru';

  return (
    <footer className={`w-full border-t border-white/10 bg-[#0A0A0C]/90 text-white backdrop-blur-xl mt-10 sm:mt-16 ${className}`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-32 sm:pb-16">
        {/* Main Footer Grid: 3 balanced columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 pb-10 border-b border-white/10">
          
          {/* Column 1: Studio Info & Schedule */}
          <div className="flex flex-col items-start gap-3">
            <span className="text-[11px] font-sans uppercase tracking-widest text-accent-blue font-semibold">
              АВТОМОЙКА И ДЕТЕЙЛИНГ
            </span>
            <h3 className="text-xl font-extrabold text-white tracking-tight">
              {name}
            </h3>
            <p className="text-xs text-[#A1A1A6] leading-relaxed max-w-sm">
              {config.branding.heroSubtitle || 'Бережная мойка, умягчённая вода и сушка тёплым воздухом без контакта жёстких тряпок.'}
            </p>

            <div className="flex items-center gap-2 mt-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white">
              <Clock size={15} className="text-accent-blue shrink-0" weight="bold" />
              <span className="font-sans font-medium text-xs text-white tracking-wide">
                {hours}
              </span>
            </div>
          </div>

          {/* Column 2: Address & Location */}
          <div className="flex flex-col items-start gap-3">
            <span className="text-[11px] font-sans uppercase tracking-widest text-accent-blue font-semibold">
              АДРЕС И ПРОЕЗД
            </span>

            <div className="flex items-start gap-2.5 text-sm text-white/95 leading-relaxed">
              <MapPin size={18} className="text-accent-blue shrink-0 mt-0.5" weight="fill" />
              <span>{address}</span>
            </div>

            <a
              href={yandexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 px-3.5 py-2 rounded-xl transition-all duration-150 active:scale-95"
            >
              <span>Построить маршрут</span>
              <ArrowUpRight size={13} weight="bold" />
            </a>
          </div>

          {/* Column 3: Contacts & Socials */}
          <div className="flex flex-col items-start gap-3">
            <span className="text-[11px] font-sans uppercase tracking-widest text-accent-blue font-semibold">
              СВЯЗАТЬСЯ С НАМИ
            </span>

            <a
              href={`tel:${cleanPhone}`}
              className="inline-flex items-center gap-2 text-base sm:text-lg font-bold font-sans text-white hover:text-accent-blue transition-colors"
            >
              <Phone size={18} weight="fill" className="text-accent-blue" />
              <span>{phone}</span>
            </a>

            <p className="text-xs text-[#A1A1A6]">
              Ответим на вопросы, проконсультируем по услугам и запишем авто:
            </p>

            {/* Social Media & Messenger Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 w-full max-w-[260px]">
              {/* Telegram */}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-[11px] font-semibold text-white transition-all duration-150 active:scale-95"
              >
                <TelegramLogo size={15} weight="fill" className="shrink-0 text-accent-blue" />
                <span className="truncate">Telegram</span>
              </a>

              {/* MAX */}
              <a
                href={maxUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="MAX"
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-[11px] font-semibold text-white transition-all duration-150 active:scale-95"
              >
                <ChatCircleDots size={15} weight="fill" className="shrink-0 text-accent-blue" />
                <span className="truncate">MAX</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50 font-sans">
          <span>
            © {currentYear} {name}. Все права защищены.
          </span>
          <div className="flex items-center gap-4">
            <span className="hover:text-white/80 transition-colors cursor-pointer">
              Политика конфиденциальности
            </span>
            <span>·</span>
            <span className="hover:text-white/80 transition-colors cursor-pointer">
              Правила автомойки
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
