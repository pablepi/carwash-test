import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useTenantConfig } from '@/lib/tenant-store';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { slugify } from '@/lib/slugify';
import { Badge } from '@/components/common/Badge';
import { GlassButton } from '@/components/common/GlassButton';
import { FloatingBottomNav } from '@/components/common/FloatingBottomNav';
import { Footer } from '@/components/client/Footer';
import {
  XCircle,
  ArrowLeft,
  ShieldCheck,
  Car,
  Ticket,
  Phone,
  ArrowUpRight,
  CircleNotch,
  WarningCircle,
  CheckCircle,
} from '@phosphor-icons/react';
import { fetchBookingsWithStatus, DEFAULT_GOOGLE_SHEETS_URL } from '@/lib/google-sheets';

export const MyBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { config: tenant } = useTenantConfig();
  const { config: siteConfig } = useSiteConfig();
  const currentSlug = tenantSlug || slugify(tenant.name || 'carwash');

  const tokenFromUrl = searchParams.get('token');
  const [searchTab, setSearchTab] = useState<'plate' | 'token'>(tokenFromUrl ? 'token' : 'plate');
  const [inputValue, setInputValue] = useState(tokenFromUrl || '');
  const [bookingData, setBookingData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  const googleSheetsUrl =
    (siteConfig as any)?.integrations?.googleSheetsUrl || DEFAULT_GOOGLE_SHEETS_URL;

  // Search booking across local storage and remote Google Sheets
  const lookupBooking = useCallback(
    async (query: string) => {
      const q = query.trim().toUpperCase();
      if (!q) return;

      setIsLoading(true);
      setNotFound(false);
      setCancelSuccessMsg(null);

      const cleanQ = q.replace(/\s+/g, '');
      const cleanQDigits = q.replace(/\D/g, '');

      // 1. First search in local storage history
      try {
        const stored: any[] = JSON.parse(localStorage.getItem('apex_bookings_history') || '[]');
        const localFound = stored.find((b) => {
          const token = (
            b.booking_number ||
            b.cancellation_token ||
            b.token ||
            b.id ||
            ''
          )
            .toUpperCase()
            .trim();
          if (token && (token === q || token.includes(q) || q.includes(token))) return true;

          const car = (b.car_model || b.carModel || '').toUpperCase().replace(/\s+/g, '');
          const plate = (b.carPlate || b.plate_number || '').toUpperCase().replace(/\s+/g, '');
          if (car.includes(cleanQ) || (plate && cleanQ.includes(plate))) return true;

          const phone = (b.client_phone || b.clientPhone || '').replace(/\D/g, '');
          if (cleanQDigits.length >= 7 && phone.includes(cleanQDigits)) return true;

          return false;
        });

        if (localFound) {
          setBookingData({
            id: localFound.id || localFound.booking_number,
            booking_number:
              localFound.booking_number ||
              localFound.token ||
              localFound.cancellation_token ||
              localFound.id,
            client_name: localFound.client_name || localFound.clientName || 'Гость',
            client_phone: localFound.client_phone || localFound.clientPhone || '',
            car_model: localFound.car_model || localFound.carModel || 'Автомобиль',
            service_title: localFound.service_title || localFound.serviceTitle || 'Комплекс мойки',
            timeStr:
              localFound.timeStr ||
              (localFound.start_time && !localFound.start_time.includes('T')
                ? localFound.start_time
                : '12:00'),
            date: localFound.date || 'Сегодня',
            total_price:
              localFound.total_price || localFound.servicePrice || localFound.totalPrice || 0,
            box_name: localFound.box_name || localFound.boxName || 'Бокс 1',
            status: localFound.status || 'pending',
            address: localFound.address || tenant.address,
            source: 'local',
          });
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Local storage booking search error:', err);
      }

      // 2. Search in remote Google Sheets database
      try {
        const res = await fetchBookingsWithStatus(googleSheetsUrl);
        if (res.success && Array.isArray(res.bookings) && res.bookings.length > 0) {
          const remoteFound = res.bookings.find((b) => {
            const num = (b.booking_number || b.id || '').toUpperCase().trim();
            if (num && !num.startsWith('БОКС') && (num === q || num.includes(q) || q.includes(num))) {
              return true;
            }

            const car = (b.carModel || '').toUpperCase().replace(/\s+/g, '');
            if (car.includes(cleanQ)) return true;

            const phone = (b.clientPhone || '').replace(/\D/g, '');
            if (cleanQDigits.length >= 7 && phone.includes(cleanQDigits)) return true;

            return false;
          });

          if (remoteFound) {
            let cleanTitle = remoteFound.serviceTitle || 'Комплекс мойки';
            if (/^\d+$/.test(cleanTitle.trim())) {
              cleanTitle = `Комплекс мойки (${cleanTitle} ₽)`;
            }

            setBookingData({
              id: remoteFound.id || remoteFound.booking_number,
              booking_number: remoteFound.booking_number || remoteFound.id,
              client_name: remoteFound.clientName || 'Гость',
              client_phone: remoteFound.clientPhone || '',
              car_model: remoteFound.carModel || 'Автомобиль',
              service_title: cleanTitle,
              timeStr: remoteFound.timeSlot || '12:00',
              date: remoteFound.date || 'Сегодня',
              total_price: remoteFound.totalPrice || 0,
              box_name: remoteFound.boxName || 'Бокс 1',
              status: remoteFound.status || 'pending',
              address: tenant.address,
              source: 'remote',
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Google Sheets booking search error:', err);
      }

      // 3. Not found
      setBookingData(null);
      setNotFound(true);
      setIsLoading(false);
    },
    [googleSheetsUrl, tenant.address]
  );

  // Auto-search if token is present in URL
  useEffect(() => {
    if (tokenFromUrl) {
      setSearchTab('token');
      setInputValue(tokenFromUrl);
      lookupBooking(tokenFromUrl);
    }
  }, [tokenFromUrl, lookupBooking]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    lookupBooking(inputValue);
  };

  const handleCancelBooking = async () => {
    if (!bookingData) return;
    if (!window.confirm('Вы действительно хотите отменить запись на мойку?')) return;

    const updated = { ...bookingData, status: 'cancelled' };
    setBookingData(updated);
    setCancelSuccessMsg('Запись успешно отменена.');

    // 1. Update localStorage
    try {
      const stored: any[] = JSON.parse(localStorage.getItem('apex_bookings_history') || '[]');
      const updatedStored = stored.map((b) => {
        const matchesId = b.id === bookingData.id;
        const matchesNum =
          b.booking_number && b.booking_number === bookingData.booking_number;
        if (matchesId || matchesNum) {
          return { ...b, status: 'cancelled' };
        }
        return b;
      });
      localStorage.setItem('apex_bookings_history', JSON.stringify(updatedStored));
    } catch (e) {}

    // 2. Send cancellation to Google Sheets if connected
    try {
      fetch(googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStatus',
          id: bookingData.id,
          booking_number: bookingData.booking_number,
          status: 'cancelled',
          phone: bookingData.client_phone,
        }),
      }).catch(() => {});
    } catch (e) {}
  };

  const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(tenant.address)}`;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-between pt-4 sm:pt-10">
      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 mb-8 sm:mb-12">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/s/${currentSlug}`)}
          className="hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#A1A1A6] hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} /> На главную студии
        </button>

        {/* Page Title & Intro */}
        <div className="mb-5 sm:mb-7">
          <Badge variant="blue" icon={<ShieldCheck size={14} weight="fill" />}>
            ПРОВЕРКА БРОНИРОВАНИЯ
          </Badge>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mt-2.5 mb-2">
            Моя запись
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1A6] max-w-2xl leading-relaxed">
            Просмотр деталей вашего визита, времени готовности бокса и моментальное управление бронью без регистрации.
          </p>
        </div>

        {/* Search Card or Booking Details */}
        {!bookingData ? (
          <div className="space-y-4 sm:space-y-5">
            {/* Main Search Card with Tabs */}
            <div className="astryx-card p-5 sm:p-8 bg-[#161618] border border-white/10 rounded-3xl shadow-2xl">
              {/* Compact Mode Switcher Tabs */}
              <div className="flex gap-1.5 p-1 rounded-2xl bg-[#1C1C1E] border border-white/10 w-fit mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTab('plate');
                    setNotFound(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    searchTab === 'plate'
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-[#A1A1A6] hover:text-white'
                  }`}
                >
                  <Car size={16} weight={searchTab === 'plate' ? 'fill' : 'regular'} />
                  <span>По госномеру</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTab('token');
                    setNotFound(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    searchTab === 'token'
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-[#A1A1A6] hover:text-white'
                  }`}
                >
                  <Ticket size={16} weight={searchTab === 'token' ? 'fill' : 'regular'} />
                  <span>По номеру записи</span>
                </button>
              </div>

              {/* Input Form with visible placeholder and formatting */}
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder={searchTab === 'plate' ? 'Например: А123АА или А123AS' : 'Например: AD-1018'}
                    value={inputValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputValue(searchTab === 'plate' ? val.toUpperCase() : val);
                      setNotFound(false);
                    }}
                    className={`w-full bg-[#1C1C1E] border border-white/15 rounded-2xl px-4 py-3.5 pl-11 text-sm sm:text-base text-white placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue transition-colors font-bold ${
                      searchTab === 'plate' ? 'uppercase tracking-wider' : 'uppercase tracking-wider'
                    }`}
                  />
                  {searchTab === 'plate' ? (
                    <Car size={18} className="absolute left-4 top-4 text-[#86868B]" />
                  ) : (
                    <Ticket size={18} className="absolute left-4 top-4 text-[#86868B]" />
                  )}
                </div>

                <GlassButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  className="sm:w-auto w-full px-8 py-3.5 font-bold flex items-center justify-center gap-2"
                >
                  {isLoading && <CircleNotch size={18} className="animate-spin" />}
                  <span>{isLoading ? 'Поиск...' : 'Найти запись'}</span>
                </GlassButton>
              </form>

              {/* Error Alert if Not Found */}
              {notFound && (
                <div className="mt-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
                  <WarningCircle size={20} className="shrink-0 text-rose-400" />
                  <span>
                    Запись с указанным {searchTab === 'plate' ? 'госномером' : 'номером'} не найдена. Проверьте правильность ввода или свяжитесь с администратором.
                  </span>
                </div>
              )}

              {/* Guidance line */}
              <p className="mt-3 text-xs text-[#86868B] leading-relaxed">
                Введите госномер автомобиля или номер вашей брони (например, AD-1018) для проверки актуального статуса.
              </p>
            </div>

            {/* Help bar with administrator phone */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:px-5 sm:py-3.5 rounded-2xl bg-[#161618] border border-white/10 text-xs text-[#A1A1A6]">
              <span>Не получается найти бронь или изменились планы?</span>
              <a
                href={`tel:${tenant.phone.replace(/[^+\d]/g, '')}`}
                className="inline-flex items-center gap-1.5 text-white font-semibold hover:text-accent-blue transition-colors shrink-0"
              >
                <Phone size={15} weight="fill" className="text-accent-blue" />
                <span>Позвонить администратору</span>
                <ArrowUpRight size={13} weight="bold" />
              </a>
            </div>
          </div>
        ) : (
          /* Active Booking Details Card */
          <div className="astryx-card p-5 sm:p-8 md:p-10 bg-[#161618] border border-white/10 rounded-3xl shadow-2xl space-y-6 animate-fade-in">
            {cancelSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle size={18} className="shrink-0 text-emerald-400" />
                <span>{cancelSuccessMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-accent-blue font-semibold block mb-1">
                  Номер бронирования: #{bookingData.booking_number}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  {bookingData.service_title}
                </h3>
              </div>
              <Badge
                variant={
                  bookingData.status === 'cancelled'
                    ? 'danger'
                    : bookingData.status === 'completed' || bookingData.status === 'done'
                    ? 'success'
                    : bookingData.status === 'in_progress'
                    ? 'blue'
                    : 'warning'
                }
              >
                {bookingData.status === 'cancelled'
                  ? 'Отменена'
                  : bookingData.status === 'completed' || bookingData.status === 'done'
                  ? 'Готова к выдаче'
                  : bookingData.status === 'in_progress'
                  ? 'Моется в боксе'
                  : 'Активна (Ожидает заезда)'}
              </Badge>
            </div>

            {/* Detailed Grid Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/60 font-semibold block">
                  Автомобиль
                </span>
                <span className="text-sm sm:text-base font-bold text-white">
                  {bookingData.car_model}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/60 font-semibold block">
                  Дата и время заезда
                </span>
                <span className="text-sm sm:text-base font-bold text-accent-blue">
                  {bookingData.date} в {bookingData.timeStr}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/60 font-semibold block">
                  Назначенный бокс
                </span>
                <span className="text-sm sm:text-base font-bold text-white">
                  {bookingData.box_name}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/60 font-semibold block">
                  К оплате при заезде
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                  {Number(bookingData.total_price || 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1 sm:col-span-2">
                <span className="text-xs uppercase tracking-wider text-white/60 font-semibold block">
                  Адрес боксов
                </span>
                <span className="text-xs sm:text-sm font-medium text-white block">
                  {bookingData.address || tenant.address}
                </span>
                <a
                  href={yandexMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent-blue hover:underline pt-1"
                >
                  <span>Построить маршрут</span>
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </div>

            {/* Actions footer */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setBookingData(null);
                  setNotFound(false);
                  setCancelSuccessMsg(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-xs font-semibold text-white transition-colors"
              >
                ← Искать другую запись
              </button>

              {bookingData.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle size={16} /> Отменить бронирование
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Studio Footer */}
      <Footer tenant={tenant} />

      {/* Floating Bottom Navigation */}
      <FloatingBottomNav />
    </div>
  );
};
