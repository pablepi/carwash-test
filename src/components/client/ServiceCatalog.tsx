import React, { useState } from 'react';
import { Clock, ArrowRight, Check } from '@phosphor-icons/react';
import { Badge } from '../common/Badge';
import { GlassButton } from '../common/GlassButton';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { CarCategoryId, ServiceItemConfig } from '@/config/siteConfig';

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  tags: string[];
  category: string;
  rawService?: ServiceItemConfig;
}

interface ServiceCatalogProps {
  services?: ServiceItem[];
  selectedServiceId?: string;
  onSelectService: (service: ServiceItem) => void;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  selectedServiceId,
  onSelectService,
}) => {
  const { config, selectedCarCategory, setSelectedCarCategory } = useSiteConfig();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filterTabs = [
    { id: 'all', label: 'Все услуги' },
    { id: 'hit', label: 'Популярное' },
    { id: 'express', label: 'Экспресс' },
    { id: 'complex', label: 'Комплексы' },
  ];

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
    }
    return `${mins} мин`;
  };

  const filteredServices = config.services.filter((s) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'hit') return s.badge === 'Хит' || s.name.toLowerCase().includes('комплекс');
    if (activeFilter === 'express') return s.badge === 'Экспресс' || s.durationMinutes <= 30;
    if (activeFilter === 'complex') return s.badge === 'Комплекс' || s.durationMinutes >= 60;
    return true;
  });

  const handleServiceClick = (s: ServiceItemConfig) => {
    const item: ServiceItem = {
      id: s.id,
      title: s.name,
      description: s.description,
      price: s.prices[selectedCarCategory],
      durationMinutes: s.durationMinutes,
      tags: [s.badge || 'Мойка', `${s.durationMinutes} мин`],
      category: 'wash',
      rawService: s,
    };
    onSelectService(item);
  };

  return (
    <section id="services" className="mx-auto max-w-5xl px-3 sm:px-6 mb-16 scroll-mt-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-accent-blue font-semibold">
              ПРАЙС-ЛИСТ И ТАРИФЫ
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#FFFFFF] tracking-tight mt-0.5">
              Услуги автомойки
            </h2>
            <p className="text-xs text-[#86868B] mt-1">
              Выберите тип вашего автомобиля для автоматического расчета точной стоимости
            </p>
          </div>

          {/* Car Category Switcher: Apple HIG Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#161618] border border-white/[0.08] rounded-2xl self-start sm:self-auto shadow-inner">
            {config.carCategories.map((cat) => {
              const isSelected = selectedCarCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCarCategory(cat.id as CarCategoryId)}
                  className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 select-none flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-accent-blue text-white shadow-md'
                      : 'text-[#86868B] hover:text-[#FFFFFF]'
                  }`}
                >
                  {isSelected && <Check size={12} weight="bold" className="shrink-0" />}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1.5 p-1 rounded-xl bg-[#161618] border border-white/[0.08] self-start overflow-x-auto max-w-full">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-white/10 text-[#FFFFFF] shadow-sm'
                  : 'text-[#86868B] hover:text-[#FFFFFF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service cards */}
      <div className="space-y-3">
        {filteredServices.map((service) => {
          const isSelected = selectedServiceId === service.id;
          const currentPrice = service.prices[selectedCarCategory];

          return (
            <div
              key={service.id}
              onClick={() => handleServiceClick(service)}
              className={`astryx-card p-4 sm:p-5 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-accent-blue bg-[#1C1C1E] shadow-[0_0_20px_-4px_var(--apple-accent-blue)] ring-1 ring-accent-blue'
                  : 'hover:border-white/20'
              }`}
            >
              {/* Top: title + duration badge */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-[#FFFFFF] tracking-tight">
                      {service.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#FFFFFF] bg-[#242426] px-2.5 py-0.5 rounded-md border border-white/15 shrink-0">
                      <Clock size={12} className="text-accent-blue" />
                      <span className="tabular-nums font-semibold text-[#FFFFFF]">
                        {formatDuration(service.durationMinutes)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[#E5E5EA] line-clamp-2 mt-1.5 leading-relaxed font-normal">
                    {service.description}
                  </p>
                </div>
              </div>

              {/* Bottom: tags + dynamic price + action button */}
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/[0.1]">
                <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                  {service.badge && (
                    <Badge variant="blue">
                      <span className="text-[#FFFFFF]">{service.badge}</span>
                    </Badge>
                  )}
                  <Badge variant="neutral">
                    <span className="text-[#FFFFFF]">
                      {config.carCategories.find((c) => c.id === selectedCarCategory)?.name}
                    </span>
                  </Badge>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="block text-[10px] font-mono text-[#86868B] uppercase tracking-wider font-semibold">
                      Стоимость
                    </span>
                    <span className="font-mono text-base sm:text-lg font-bold text-[#FFFFFF] tabular-nums transition-all">
                      {currentPrice.toLocaleString('ru-RU')}&nbsp;₽
                    </span>
                  </div>

                  <GlassButton
                    variant="primary"
                    size="sm"
                    className="font-bold text-[#FFFFFF]"
                  >
                    <span className="flex items-center gap-1.5 text-[#FFFFFF] font-bold">
                      Записаться <ArrowRight size={13} weight="bold" className="text-[#FFFFFF]" />
                    </span>
                  </GlassButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
