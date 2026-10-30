import React, { useMemo, useState, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { WarningCircle } from '@phosphor-icons/react';
import { calculateAvailableSlots } from '@/lib/slot-calculator';
import { fetchBusySlotsFromGoogleSheets } from '@/lib/google-sheets';
import { TenantConfig } from '@/types/tenant';
import { ServiceItem } from './ServiceCatalog';

interface SlotPickerProps {
  tenant: TenantConfig;
  selectedService: ServiceItem | null;
  onSlotSelected: (slotDateTimeIso: string, slotTimeStr: string, dateStr?: string, boxName?: string) => void;
  selectedSlotIso?: string;
  isCompact?: boolean;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  tenant,
  selectedService,
  onSlotSelected,
  selectedSlotIso,
  isCompact = false,
}) => {
  const today = useMemo(() => new Date(), []);
  const availableDays = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => addDays(today, i));
  }, [today]);

  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const boxes = useMemo(() => {
    return Array.from({ length: tenant.boxesCount }).map((_, i) => ({
      id: `box-${i + 1}`,
      name: `Бокс ${i + 1}`,
      isActive: true,
    }));
  }, [tenant.boxesCount]);

  // Sample busy intervals
  const mockBusyIntervals = useMemo(() => {
    const dStr = format(today, 'yyyy-MM-dd');
    return [
      {
        boxId: 'box-1',
        startTime: new Date(`${dStr}T11:00:00+03:00`),
        bufferedEndTime: new Date(`${dStr}T12:10:00+03:00`),
      },
      {
        boxId: 'box-2',
        startTime: new Date(`${dStr}T14:30:00+03:00`),
        bufferedEndTime: new Date(`${dStr}T15:40:00+03:00`),
      },
      {
        boxId: 'box-1',
        startTime: new Date(`${dStr}T17:00:00+03:00`),
        bufferedEndTime: new Date(`${dStr}T18:10:00+03:00`),
      },
      {
        boxId: 'box-2',
        startTime: new Date(`${dStr}T17:00:00+03:00`),
        bufferedEndTime: new Date(`${dStr}T18:10:00+03:00`),
      },
      ...(tenant.boxesCount > 2
        ? [{
            boxId: 'box-3',
            startTime: new Date(`${dStr}T17:00:00+03:00`),
            bufferedEndTime: new Date(`${dStr}T18:10:00+03:00`),
          }]
        : []),
    ];
  }, [today, tenant.boxesCount]);

  const targetDateStr = format(selectedDate, 'yyyy-MM-dd');
  const serviceDuration = selectedService ? selectedService.durationMinutes : 30;

  const [googleBusySlots, setGoogleBusySlots] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSlots = async () => {
      try {
        const slots = await fetchBusySlotsFromGoogleSheets(targetDateStr);
        if (isMounted) {
          setGoogleBusySlots(slots);
        }
      } catch (err) {
        // ignore offline errors
      }
    };
    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [targetDateStr]);

  const combinedBusyIntervals = useMemo(() => {
    const remoteIntervals = googleBusySlots.map((timeStr, i) => {
      const start = new Date(`${targetDateStr}T${timeStr}:00`);
      const end = new Date(start.getTime() + (serviceDuration + tenant.bufferMinutes) * 60 * 1000);
      return {
        boxId: `box-${(i % tenant.boxesCount) + 1}`,
        startTime: start,
        bufferedEndTime: end,
      };
    });

    return [...mockBusyIntervals, ...remoteIntervals];
  }, [mockBusyIntervals, googleBusySlots, targetDateStr, serviceDuration, tenant.bufferMinutes, tenant.boxesCount]);

  const dayAvailability = useMemo(() => {
    return calculateAvailableSlots({
      targetDate: targetDateStr,
      timezone: tenant.timezone,
      openingHour: tenant.openingHour,
      closingHour: tenant.closingHour,
      slotIntervalMinutes: tenant.slotIntervalMinutes,
      serviceDurationMinutes: serviceDuration,
      bufferMinutes: tenant.bufferMinutes,
      workDays: tenant.workDays,
      boxes,
      busyIntervals: combinedBusyIntervals,
      nowUtc: new Date(),
    });
  }, [targetDateStr, tenant, serviceDuration, boxes, combinedBusyIntervals]);

  return (
    <div className={isCompact ? '' : 'mx-auto max-w-5xl px-3 sm:px-6 mb-16 scroll-mt-6'}>
      {!isCompact && (
        <div className="mb-5">
          <span className="text-[11px] font-mono uppercase tracking-widest text-accent-blue font-semibold">
            РАСПИСАНИЕ
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F5F7] tracking-tight mt-0.5">
            Запись на мойку
          </h2>
          <p className="text-xs text-[#A1A1A6] mt-1">
            {selectedService ? (
              <span>
                <strong className="text-[#F5F5F7]">{selectedService.title}</strong> · {selectedService.durationMinutes} мин + {tenant.bufferMinutes} мин буфер
              </span>
            ) : (
              <span className="text-[#FF9F0A] flex items-center gap-1">
                <WarningCircle size={14} /> Выберите услугу выше
              </span>
            )}
          </p>
        </div>
      )}

      <div className={isCompact ? 'space-y-4' : 'astryx-card p-4 sm:p-6'}>
        {/* Calendar strip */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[#F5F5F7] uppercase tracking-wider font-semibold">
              Дата заезда
            </span>
            <span className="text-xs text-white capitalize font-semibold tracking-wide">
              {format(selectedDate, 'LLLL yyyy', { locale: ru })}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {availableDays.map((d) => {
              const isSelected = isSameDay(d, selectedDate);
              // Дни недели по-русски: пн, вт, ср, чт, пт, сб, вс
              const ruWeekDays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
              const dayName = ruWeekDays[d.getDay()];
              const dayNum = format(d, 'd');

              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center justify-center min-w-[52px] py-2 px-1.5 rounded-xl transition-all duration-150 active:scale-95 border shrink-0 ${
                    isSelected
                      ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_16px_-3px_var(--apple-accent-blue)] font-bold'
                      : 'bg-[#1C1C1E] text-white border-white/15 hover:border-white/30 hover:bg-[#252528]'
                  }`}
                >
                  <span className={`text-[11px] uppercase tracking-wider font-semibold ${isSelected ? 'text-white' : 'text-white/70'}`}>
                    {dayName}
                  </span>
                  <span className="text-base font-bold text-white tabular-nums mt-0.5">
                    {dayNum}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot grid */}
        <div>
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <span className="text-[11px] font-mono text-[#F5F5F7] uppercase tracking-wider font-semibold">
              Свободные слоты
            </span>
            <div className="flex items-center gap-2.5 text-[10px] font-mono text-[#A1A1A6]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-[#1C1C1E] border border-white/10" /> Свободно
              </span>
              <span className="flex items-center gap-1 text-accent-blue">
                <span className="w-2 h-2 rounded-sm bg-accent-blue" /> Выбрано
              </span>
            </div>
          </div>

          {!dayAvailability.isWorkDay ? (
            <div className="p-6 text-center text-[#86868B] font-mono text-xs border border-dashed border-white/10 rounded-xl">
              Мойка не работает в этот день
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {dayAvailability.slots.map((slot) => {
                const isSelected = selectedSlotIso === slot.dateTimeIso;
                const isDisabled = !slot.isAvailable;

                return (
                  <button
                    type="button"
                    key={slot.timeStr}
                    disabled={isDisabled}
                    onClick={() => onSlotSelected(slot.dateTimeIso, slot.timeStr, targetDateStr, slot.boxName)}
                    className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border text-sm font-mono font-semibold transition-all duration-150 tabular-nums ${
                      isSelected
                        ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_16px_-3px_var(--apple-accent-blue)] font-bold ring-2 ring-accent-blue/30'
                        : isDisabled
                        ? 'bg-black/50 text-[#48484A] border-white/[0.04] cursor-not-allowed line-through opacity-40'
                        : 'bg-[#1C1C1E] text-white border-white/15 hover:border-accent-blue/50 hover:bg-[#2C2C2E] active:scale-95'
                    }`}
                  >
                    <span>{slot.timeStr}</span>
                    {slot.isAvailable && slot.boxName && (
                      <span className={`text-[9px] mt-0.5 font-normal ${isSelected ? 'text-white/90 font-medium' : 'text-[#86868B]'}`}>
                        {slot.boxName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
