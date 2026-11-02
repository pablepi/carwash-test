import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Bell, ShareNetwork, Clock, ArrowLeft, Ticket } from '@phosphor-icons/react';
import { generateIcsFile, downloadIcsFile } from '@/lib/ics';
import { TenantConfig } from '@/types/tenant';
import { GlassButton } from '../common/GlassButton';
import { Badge } from '../common/Badge';

interface BookingSuccessProps {
  booking: any;
  tenant: TenantConfig;
  onReset: () => void;
}

export const BookingSuccess: React.FC<BookingSuccessProps> = ({ booking, tenant, onReset }) => {
  const navigate = useNavigate();
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const rawStartTime = booking?.start_time || booking?.startTimeIso;
  let validStart = new Date();
  if (rawStartTime) {
    try {
      const parsed = typeof rawStartTime === 'string' ? parseISO(rawStartTime) : new Date(rawStartTime);
      if (!isNaN(parsed.getTime())) {
        validStart = parsed;
      }
    } catch {}
  }

  const dateFormatted = format(validStart, 'd MMMM yyyy (EEEE)', { locale: ru });
  const timeFormatted = booking?.timeStr || format(validStart, 'HH:mm');

  const bookingNumber = booking?.booking_number || booking?.cancellation_token || booking?.token || 'AD-1001';
  const serviceTitle = booking?.service_title || booking?.serviceTitle || 'Услуга автомойки';
  const carModel = booking?.car_model || booking?.carModel || 'Автомобиль';
  const totalPrice = Number(booking?.total_price ?? booking?.servicePrice ?? 0);

  // Extract plate number for fail-safe cross-device deep linking
  const rawPlate = booking?.carPlate || booking?.plate_number || '';
  const matchPlate = rawPlate || (booking?.carModel || booking?.car_model || '').match(/\[(.*?)\]/)?.[1] || '';
  const cleanPlate = matchPlate.replace(/[^A-Za-zА-Яа-я0-9]/g, '').toUpperCase();

  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const plateQuery = cleanPlate ? `&plate=${encodeURIComponent(cleanPlate)}` : '';
  const bookingPageRelPath = `/s/${tenant.slug}/my-booking?token=${encodeURIComponent(bookingNumber)}${plateQuery}`;
  const fullBookingUrl = `${window.location.origin}${basePath}${bookingPageRelPath}`;

  // Handle ICS download
  const handleDownloadCalendar = () => {
    try {
      const startTimeIso = booking?.start_time || booking?.startTimeIso || validStart.toISOString();
      const endTimeIso = booking?.end_time || booking?.endTimeIso || new Date(validStart.getTime() + 60 * 60 * 1000).toISOString();
      const ics = generateIcsFile({
        title: `${serviceTitle} | ${tenant.name}`,
        description: `Авто: ${carModel}\nСумма: ${totalPrice} ₽\nКод отмены: ${bookingNumber}`,
        location: tenant.address,
        startTimeIso,
        endTimeIso,
        timezone: tenant.timezone || 'Europe/Moscow',
        organizerName: tenant.name,
      });

      downloadIcsFile(ics, `detailing-${format(validStart, 'yyyyMMdd-HHmm')}.ics`);
    } catch (err) {
      console.error('Failed to generate ICS:', err);
    }
  };

  // Web Push Subscription Simulation
  const handlePushOptIn = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setPushSubscribed(true);
      }
    } else {
      setPushSubscribed(true);
    }
  };

  // Copy booking direct link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullBookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Navigate directly to booking details page
  const handleGoToBooking = () => {
    navigate(bookingPageRelPath);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8 animate-fade-in-up">
      <div className="astryx-card p-6 sm:p-8 bg-base-elevated border border-white/10 shadow-car-lacquer text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle size={36} weight="fill" />
        </div>

        <Badge variant="success">ЗАПИСЬ УСПЕШНО ОФОРМЛЕНА</Badge>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight mt-3 mb-1">
          Ждём вас на мойку
        </h2>
        <p className="text-xs text-text-secondary max-w-md mx-auto mb-4">
          Бронь зафиксирована. Регистрация не требуется — используйте номер записи для проверки статуса.
        </p>

        {/* Индивидуальный номер записи */}
        <div className="mx-auto max-w-sm mb-6 p-4 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-between">
          <div className="text-left">
            <span className="block text-[10px] uppercase tracking-wider text-[#A1A1A6] font-semibold">
              Ваш номер записи
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-wider font-mono">
              {bookingNumber}
            </span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(bookingNumber);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold text-white transition-colors"
          >
            {copiedLink ? 'Скопировано!' : 'Скопировать'}
          </button>
        </div>

        {/* Booking Card Spec */}
        <div className="astryx-card p-5 bg-base-surface text-left border border-white/5 space-y-3 mb-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-mono text-text-secondary">Услуга:</span>
            <span className="text-sm font-bold text-text-primary text-right">{serviceTitle}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-mono text-[#F5F5F7]">Дата и время:</span>
            <span className="text-sm font-mono font-bold text-accent-blue tabular-nums">
              {dateFormatted}, {timeFormatted}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-mono text-[#F5F5F7]">Автомобиль:</span>
            <span className="text-sm font-mono text-[#F5F5F7] font-semibold">{carModel}</span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <span className="text-xs font-mono text-[#F5F5F7]">Локация:</span>
            <span className="text-xs text-[#F5F5F7] text-right max-w-[240px] truncate">{tenant.address}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs uppercase tracking-wider font-semibold text-[#F5F5F7]">
              Сумма к оплате:
            </span>
            <span className="text-xl font-bold text-white tracking-wide tabular-nums">
              {totalPrice.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>

        {/* Cancellation Notice Timer */}
        <div className="p-3 rounded-xl bg-base-darkest border border-white/5 flex items-center justify-between text-xs font-mono text-text-secondary mb-6">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            <span>Бесплатная отмена:</span>
          </div>
          <span className="text-text-primary font-medium">до 2 часов до заезда</span>
        </div>

        {/* Action Buttons: View booking, Calendar, Copy Link */}
        <div className="space-y-3">
          <GlassButton
            variant="primary"
            fullWidth
            onClick={handleGoToBooking}
            icon={<Ticket size={18} weight="bold" />}
            className="font-bold text-white shadow-lg"
          >
            Посмотреть мою запись
          </GlassButton>

          <GlassButton
            variant="ghost"
            fullWidth
            onClick={handleDownloadCalendar}
            icon={<Calendar size={18} weight="bold" />}
          >
            Добавить в Apple / Google Календарь (.ics)
          </GlassButton>

          <div className="grid grid-cols-2 gap-3">
            <GlassButton
              variant="ghost"
              onClick={handlePushOptIn}
              icon={<Bell size={18} weight={pushSubscribed ? 'fill' : 'regular'} />}
              disabled={pushSubscribed}
            >
              {pushSubscribed ? 'Напоминание включено' : 'Напомнить за 24ч'}
            </GlassButton>

            <GlassButton
              variant="ghost"
              onClick={handleCopyLink}
              icon={<ShareNetwork size={18} />}
            >
              {copiedLink ? 'Ссылка скопирована' : 'Ссылка на бронь'}
            </GlassButton>
          </div>
        </div>

        <button
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-mono text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Вернуться на главную
        </button>
      </div>
    </div>
  );
};
