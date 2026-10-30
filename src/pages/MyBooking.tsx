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
  Clock,
  Drop,
  Sparkle,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import {
  fetchBookingsWithStatus,
  updateRemoteBookingStatus,
  DEFAULT_GOOGLE_SHEETS_URL,
} from '@/lib/google-sheets';

export const MyBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { config: tenant } = useTenantConfig();
  const { config: siteConfig } = useSiteConfig();
  const currentSlug = tenantSlug || slugify(tenant.name || 'carwash');

  const tokenFromUrl = searchParams.get('token');
  const plateFromUrl = searchParams.get('plate');

  const [searchTab, setSearchTab] = useState<'plate' | 'token'>(plateFromUrl ? 'plate' : 'token');
  const [inputValue, setInputValue] = useState(tokenFromUrl || plateFromUrl || '');
  const [bookingData, setBookingData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [notFound, setNotFound] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  const googleSheetsUrl =
    (siteConfig as any)?.integrations?.googleSheetsUrl || DEFAULT_GOOGLE_SHEETS_URL;

  // Helper to persist updated status in browser cache
  const updateLocalBookingStatus = (idOrNum: string, newStatus: string) => {
    try {
      const raw = localStorage.getItem('apex_bookings_history');
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      const updated = list.map((b: any) => {
        const match =
          b.id === idOrNum ||
          b.booking_number === idOrNum ||
          b.token === idOrNum ||
          b.cancellation_token === idOrNum;
        return match ? { ...b, status: newStatus } : b;
      });
      localStorage.setItem('apex_bookings_history', JSON.stringify(updated));
    } catch {}
  };

  // Multi-key resolution of current car status (checking remote overrides, then raw status)
  const resolveEffectiveStatus = useCallback(
    (
      rawStatus: string,
      id?: string,
      num?: string,
      phone?: string,
      car?: string
    ): 'pending' | 'in_progress' | 'completed' | 'done' | 'cancelled' => {
      const overrides = (siteConfig as any)?.statusOverrides || {};
      const cleanPhone = (phone || '').replace(/\D/g, '');
      const cleanPlate = (car || '')
        .match(/\[(.*?)\]/)?.[1]
        ?.replace(/[^A-Za-zА-Яа-я0-9]/g, '')
        .toUpperCase() || '';

      if (id && overrides[id]) return overrides[id];
      if (num && overrides[num]) return overrides[num];
      if (cleanPlate && overrides[`plate_${cleanPlate}`]) return overrides[`plate_${cleanPlate}`];
      if (cleanPhone && cleanPhone.length >= 7 && overrides[`phone_${cleanPhone}`]) {
        return overrides[`phone_${cleanPhone}`];
      }

      const s = String(rawStatus || '').toLowerCase().trim();
      if (s === 'in_progress' || s.includes('моется') || s.includes('в работе')) return 'in_progress';
      if (s === 'completed' || s.includes('готов')) return 'completed';
      if (s === 'done' || s.includes('завершен')) return 'done';
      if (s === 'cancelled' || s.includes('отмен')) return 'cancelled';
      return 'pending';
    },
    [siteConfig]
  );

  // Search booking across local storage and remote Google Sheets
  const lookupBooking = useCallback(
    async (primaryQuery: string, secondaryPlate?: string) => {
      const q1 = (primaryQuery || '').trim().toUpperCase();
      const q2 = (secondaryPlate || '').trim().toUpperCase();
      if (!q1 && !q2) return;

      setIsLoading(true);
      setNotFound(false);
      setCancelSuccessMsg(null);

      const cleanQ1 = q1.replace(/\s+/g, '');
      const cleanQ1Digits = q1.replace(/\D/g, '');
      const cleanQ2 = q2.replace(/\s+/g, '');

      // Helper matcher for any booking object
      const matchesQuery = (b: any) => {
        const token = String(
          b.booking_number || b.cancellation_token || b.token || b.id || ''
        )
          .toUpperCase()
          .trim();
        const car = String(b.car_model || b.carModel || '')
          .toUpperCase()
          .replace(/\s+/g, '');
        const plate = String(b.carPlate || b.plate_number || '')
          .toUpperCase()
          .replace(/\s+/g, '');
        const phone = String(b.client_phone || b.clientPhone || '').replace(/\D/g, '');

        // 1. Match primary query
        if (q1) {
          if (token && !token.startsWith('БОКС') && (token === q1 || token.includes(q1) || q1.includes(token))) return true;
          if (car.includes(cleanQ1) || (plate && cleanQ1.includes(plate))) return true;
          if (cleanQ1Digits.length >= 6 && phone.includes(cleanQ1Digits)) return true;
        }

        // 2. Match secondary plate query
        if (cleanQ2) {
          if (car.includes(cleanQ2) || (plate && plate.includes(cleanQ2))) return true;
        }

        return false;
      };

      // 1. Search in local storage history
      let localMatch: any = null;
      try {
        const stored: any[] = JSON.parse(localStorage.getItem('apex_bookings_history') || '[]');
        localMatch = stored.find(matchesQuery);

        if (localMatch) {
          const effectiveStatus = resolveEffectiveStatus(
            localMatch.status || 'pending',
            localMatch.id,
            localMatch.booking_number || localMatch.token,
            localMatch.client_phone || localMatch.clientPhone,
            localMatch.car_model || localMatch.carModel
          );

          setBookingData({
            id: localMatch.id || localMatch.booking_number,
            booking_number:
              localMatch.booking_number ||
              localMatch.token ||
              localMatch.cancellation_token ||
              localMatch.id,
            client_name: localMatch.client_name || localMatch.clientName || 'Гость',
            client_phone: localMatch.client_phone || localMatch.clientPhone || '',
            car_model: localMatch.car_model || localMatch.carModel || 'Автомобиль',
            service_title: localMatch.service_title || localMatch.serviceTitle || 'Комплекс мойки',
            timeStr:
              localMatch.timeStr ||
              (localMatch.start_time && !localMatch.start_time.includes('T')
                ? localMatch.start_time
                : '12:00'),
            date: localMatch.date || 'Сегодня',
            total_price:
              localMatch.total_price || localMatch.servicePrice || localMatch.totalPrice || 0,
            box_name: localMatch.box_name || localMatch.boxName || 'Бокс 1',
            status: effectiveStatus,
            address: localMatch.address || tenant.address,
            source: 'local',
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Local storage booking search error:', err);
      }

      // 2. Search in remote Google Sheets database to pull latest data & status
      try {
        const res = await fetchBookingsWithStatus(googleSheetsUrl);
        if (res.success && Array.isArray(res.bookings) && res.bookings.length > 0) {
          const remoteFound = res.bookings.find(matchesQuery);

          if (remoteFound) {
            let cleanTitle = remoteFound.serviceTitle || localMatch?.service_title || 'Комплекс мойки';
            if (/^\d+$/.test(cleanTitle.trim())) {
              cleanTitle = localMatch?.service_title || `Комплекс мойки (${cleanTitle} ₽)`;
            }

            const effectiveStatus = resolveEffectiveStatus(
              remoteFound.status,
              remoteFound.id,
              remoteFound.booking_number,
              remoteFound.clientPhone,
              remoteFound.carModel
            );

            setBookingData((prev: any) => ({
              id: remoteFound.id || remoteFound.booking_number,
              booking_number: remoteFound.booking_number || prev?.booking_number || remoteFound.id,
              client_name: remoteFound.clientName || prev?.client_name || 'Гость',
              client_phone: remoteFound.clientPhone || prev?.client_phone || '',
              car_model: remoteFound.carModel || prev?.car_model || 'Автомобиль',
              service_title: cleanTitle,
              timeStr: remoteFound.timeSlot || prev?.timeStr || '12:00',
              date: remoteFound.date || prev?.date || 'Сегодня',
              total_price: remoteFound.totalPrice || prev?.total_price || 0,
              box_name: remoteFound.boxName || prev?.box_name || 'Бокс 1',
              status: effectiveStatus,
              address: tenant.address,
              source: 'remote',
            }));

            updateLocalBookingStatus(remoteFound.id || remoteFound.booking_number, effectiveStatus);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Google Sheets booking search error:', err);
      }

      if (localMatch) {
        return;
      }

      // 3. Not found
      setBookingData(null);
      setNotFound(true);
      setIsLoading(false);
    },
    [googleSheetsUrl, tenant.address, resolveEffectiveStatus]
  );

  // Poll remote status for active booking
  const refreshBookingStatus = useCallback(
    async (silent = false) => {
      if (!bookingData) return;
      if (!silent) setIsRefreshingStatus(true);

      try {
        // 1. Check shared config overrides first
        const overrideStatus = resolveEffectiveStatus(
          bookingData.status,
          bookingData.id,
          bookingData.booking_number,
          bookingData.client_phone,
          bookingData.car_model
        );

        if (overrideStatus !== bookingData.status) {
          setBookingData((prev: any) => (prev ? { ...prev, status: overrideStatus } : null));
          updateLocalBookingStatus(bookingData.id || bookingData.booking_number, overrideStatus);
        }

        // 2. Fetch live data from Google Sheets
        const res = await fetchBookingsWithStatus(googleSheetsUrl);
        if (res.success && Array.isArray(res.bookings)) {
          const cleanQ = (bookingData.booking_number || bookingData.id || '').toUpperCase().trim();
          const cleanPlate = (bookingData.car_model || '')
            .match(/\[(.*?)\]/)?.[1]
            ?.replace(/[^A-Za-zА-Яа-я0-9]/g, '')
            .toUpperCase() || '';
          const cleanPhone = (bookingData.client_phone || '').replace(/\D/g, '');

          const match = res.bookings.find((b) => {
            const num = (b.booking_number || b.id || '').toUpperCase().trim();
            if (cleanQ && num && (num === cleanQ || num.includes(cleanQ) || cleanQ.includes(num))) return true;
            const car = (b.carModel || '').toUpperCase().replace(/[^A-Za-zА-Яа-я0-9]/g, '');
            if (cleanPlate && car.includes(cleanPlate)) return true;
            const phone = (b.clientPhone || '').replace(/\D/g, '');
            if (cleanPhone.length >= 7 && phone && phone.includes(cleanPhone)) return true;
            return false;
          });

          if (match) {
            const finalStatus = resolveEffectiveStatus(
              match.status,
              match.id,
              match.booking_number,
              match.clientPhone,
              match.carModel
            );
            if (finalStatus !== bookingData.status) {
              setBookingData((prev: any) => (prev ? { ...prev, status: finalStatus } : null));
              updateLocalBookingStatus(bookingData.id || bookingData.booking_number, finalStatus);
            }
          }
        }
        setLastCheckTime(new Date());
      } catch (e) {
        console.warn('Status refresh error:', e);
      } finally {
        if (!silent) setIsRefreshingStatus(false);
      }
    },
    [bookingData, googleSheetsUrl, resolveEffectiveStatus]
  );

  // Auto-poll status every 10 seconds while the client is on the page
  useEffect(() => {
    if (!bookingData) return;
    const interval = setInterval(() => {
      refreshBookingStatus(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [bookingData, refreshBookingStatus]);

  // Sync status if siteConfig changes in background
  useEffect(() => {
    if (bookingData && (siteConfig as any)?.statusOverrides) {
      const overrideStatus = resolveEffectiveStatus(
        bookingData.status,
        bookingData.id,
        bookingData.booking_number,
        bookingData.client_phone,
        bookingData.car_model
      );
      if (overrideStatus !== bookingData.status) {
        setBookingData((prev: any) => (prev ? { ...prev, status: overrideStatus } : null));
        updateLocalBookingStatus(bookingData.id || bookingData.booking_number, overrideStatus);
      }
    }
  }, [siteConfig, bookingData, resolveEffectiveStatus]);

  // Auto-search if token or plate is in URL, otherwise auto-load latest booking on current device
  useEffect(() => {
    if (tokenFromUrl || plateFromUrl) {
      if (tokenFromUrl) setSearchTab('token');
      else if (plateFromUrl) setSearchTab('plate');
      setInputValue(tokenFromUrl || plateFromUrl || '');
      lookupBooking(tokenFromUrl || '', plateFromUrl || '');
    } else {
      // Auto-load latest booking for the user on this device so they immediately see their visit
      try {
        const stored: any[] = JSON.parse(localStorage.getItem('apex_bookings_history') || '[]');
        if (stored.length > 0) {
          const latest = stored[0];
          const effectiveStatus = resolveEffectiveStatus(
            latest.status || 'pending',
            latest.id,
            latest.booking_number || latest.token,
            latest.client_phone || latest.clientPhone,
            latest.car_model || latest.carModel
          );

          setBookingData({
            id: latest.id || latest.booking_number,
            booking_number:
              latest.booking_number ||
              latest.token ||
              latest.cancellation_token ||
              latest.id,
            client_name: latest.client_name || latest.clientName || 'Гость',
            client_phone: latest.client_phone || latest.clientPhone || '',
            car_model: latest.car_model || latest.carModel || 'Автомобиль',
            service_title: latest.service_title || latest.serviceTitle || 'Комплекс мойки',
            timeStr:
              latest.timeStr ||
              (latest.start_time && !latest.start_time.includes('T')
                ? latest.start_time
                : '12:00'),
            date: latest.date || 'Сегодня',
            total_price:
              latest.total_price || latest.servicePrice || latest.totalPrice || 0,
            box_name: latest.box_name || latest.boxName || 'Бокс 1',
            status: effectiveStatus,
            address: latest.address || tenant.address,
            source: 'local',
          });
        }
      } catch (e) {}
    }
  }, [tokenFromUrl, plateFromUrl, lookupBooking, tenant.address, resolveEffectiveStatus]);

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
    updateLocalBookingStatus(bookingData.id || bookingData.booking_number, 'cancelled');

    // 2. Send cancellation to Google Sheets if connected
    updateRemoteBookingStatus(
      {
        id: bookingData.id,
        booking_number: bookingData.booking_number,
        clientPhone: bookingData.client_phone,
        carModel: bookingData.car_model,
      },
      'cancelled',
      googleSheetsUrl
    ).catch(() => {});
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
                    className="w-full bg-[#1C1C1E] border border-white/15 rounded-2xl px-4 py-3.5 pl-11 text-sm sm:text-base text-white placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue transition-colors font-bold uppercase tracking-wider"
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

            {/* Live Car Status Tracker & Auto-Sync Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    {bookingData.status === 'in_progress' ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-blue"></span>
                      </>
                    ) : bookingData.status === 'completed' || bookingData.status === 'done' ? (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                    ) : bookingData.status === 'cancelled' ? (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                    )}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-white/70 font-bold">
                    Текущий статус машины в боксе
                  </span>
                </div>

                {/* Manual refresh button with animated icon */}
                <button
                  type="button"
                  onClick={() => refreshBookingStatus(false)}
                  disabled={isRefreshingStatus}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] text-xs font-semibold text-white/90 hover:text-white transition-all active:scale-95 border border-white/10"
                  title="Проверить статус"
                >
                  <ArrowsClockwise
                    size={14}
                    className={isRefreshingStatus ? 'animate-spin text-accent-blue' : ''}
                  />
                  <span>{isRefreshingStatus ? 'Проверка...' : 'Обновить статус'}</span>
                </button>
              </div>

              {bookingData.status === 'cancelled' ? (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs">
                  <span className="font-bold block text-sm mb-1 text-rose-400">Бронирование отменено</span>
                  Запись на мойку была отменена. Чтобы выбрать другое время или автомобиль, вернитесь на главную страницу.
                </div>
              ) : (
                <>
                  {/* Step Progress Indicators */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* Step 1: Ожидает */}
                    <div
                      className={`p-3 rounded-xl border text-center transition-all ${
                        bookingData.status === 'pending'
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                          : bookingData.status === 'in_progress' || bookingData.status === 'completed' || bookingData.status === 'done'
                          ? 'bg-white/[0.04] border-emerald-500/30 text-emerald-400'
                          : 'bg-white/[0.02] border-white/5 text-white/40'
                      }`}
                    >
                      <div className="flex justify-center mb-1.5">
                        <Clock size={20} weight={bookingData.status === 'pending' ? 'fill' : 'regular'} />
                      </div>
                      <span className="block text-[11px] sm:text-xs font-bold leading-tight">
                        1. Ожидает
                      </span>
                      <span className="text-[10px] text-white/50 hidden sm:block mt-0.5">
                        {bookingData.status === 'pending' ? 'Готовится бокс' : 'Заезд назначен'}
                      </span>
                    </div>

                    {/* Step 2: В боксе */}
                    <div
                      className={`p-3 rounded-xl border text-center transition-all ${
                        bookingData.status === 'in_progress'
                          ? 'bg-accent-blue/15 border-accent-blue/50 text-accent-blue ring-2 ring-accent-blue/30 shadow-lg'
                          : bookingData.status === 'completed' || bookingData.status === 'done'
                          ? 'bg-white/[0.04] border-emerald-500/30 text-emerald-400'
                          : 'bg-white/[0.02] border-white/5 text-white/40'
                      }`}
                    >
                      <div className="flex justify-center mb-1.5">
                        <Drop
                          size={20}
                          weight={bookingData.status === 'in_progress' ? 'fill' : 'regular'}
                          className={bookingData.status === 'in_progress' ? 'animate-bounce' : ''}
                        />
                      </div>
                      <span className="block text-[11px] sm:text-xs font-bold leading-tight">
                        2. Моется
                      </span>
                      <span className="text-[10px] text-white/50 hidden sm:block mt-0.5">
                        {bookingData.status === 'in_progress' ? 'Активная мойка' : 'В процессе'}
                      </span>
                    </div>

                    {/* Step 3: Готова */}
                    <div
                      className={`p-3 rounded-xl border text-center transition-all ${
                        bookingData.status === 'completed' || bookingData.status === 'done'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 ring-2 ring-emerald-500/30 shadow-lg'
                          : 'bg-white/[0.02] border-white/5 text-white/40'
                      }`}
                    >
                      <div className="flex justify-center mb-1.5">
                        <Sparkle
                          size={20}
                          weight={bookingData.status === 'completed' || bookingData.status === 'done' ? 'fill' : 'regular'}
                        />
                      </div>
                      <span className="block text-[11px] sm:text-xs font-bold leading-tight">
                        3. Готова
                      </span>
                      <span className="text-[10px] text-white/50 hidden sm:block mt-0.5">
                        {bookingData.status === 'completed' || bookingData.status === 'done' ? 'Можно забирать' : 'Выдача'}
                      </span>
                    </div>
                  </div>

                  {/* Contextual Status Banner Description */}
                  <div className="text-xs text-white/80 bg-black/40 rounded-xl px-3.5 py-2.5 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                    <span>
                      {bookingData.status === 'pending' &&
                        `Ожидаем ваш автомобиль в ${bookingData.box_name} к ${bookingData.timeStr}. Мастера подготовят пост к заезду.`}
                      {bookingData.status === 'in_progress' &&
                        `Автомобиль заехал в ${bookingData.box_name}! Мастера уже выполняют комплексную мойку и сушку.`}
                      {(bookingData.status === 'completed' || bookingData.status === 'done') &&
                        'Автомобиль чист, просушен и готов к выдаче! Можете подходить к боксу.'}
                    </span>
                    <span className="text-[10px] text-white/40 shrink-0">
                      Автообновление (10 сек) • {lastCheckTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </>
              )}
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
                  setInputValue('');
                  navigate(`/s/${currentSlug}/my-booking`, { replace: true });
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-xs font-semibold text-white transition-colors"
              >
                ← Искать по другому номеру или авто
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
