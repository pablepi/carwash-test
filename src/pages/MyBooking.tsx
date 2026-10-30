import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useTenantConfig } from '@/lib/tenant-store';
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
} from '@phosphor-icons/react';

export const MyBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { config: tenant } = useTenantConfig();
  const currentSlug = tenantSlug || slugify(tenant.name || 'carwash');

  const tokenFromUrl = searchParams.get('token');
  const [searchTab, setSearchTab] = useState<'plate' | 'token'>('plate');
  const [inputValue, setInputValue] = useState(tokenFromUrl || '');
  const [bookingData, setBookingData] = useState<any | null>(null);
  const [, setIsCancelled] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setSearchTab('token');
      setInputValue(tokenFromUrl);
      setBookingData({
        id: 'bk-9941',
        cancellation_token: tokenFromUrl,
        client_name: 'Константин',
        car_model: 'Porsche 911 Carrera 4S [А 777 АА 777]',
        service_title: 'Детейлинг-мойка Премиум (3 фазы)',
        start_time: '2026-10-27T11:00:00+03:00',
        total_price: 3500,
        status: 'pending',
        address: tenant.address,
      });
    }
  }, [tokenFromUrl, tenant.address]);

  const handleCancelBooking = () => {
    if (window.confirm('Отменить запись на мойку?')) {
      setIsCancelled(true);
      if (bookingData) {
        setBookingData({ ...bookingData, status: 'cancelled' });
      }
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim().toUpperCase();
    if (!query) return;

    try {
      const stored: any[] = JSON.parse(localStorage.getItem('apex_bookings_history') || '[]');
      const found = stored.find(
        (b) =>
          b.cancellation_token?.toUpperCase().includes(query) ||
          b.booking_number?.toUpperCase().includes(query) ||
          b.token?.toUpperCase().includes(query) ||
          b.car_model?.toUpperCase().includes(query) ||
          b.carModel?.toUpperCase().includes(query) ||
          b.carPlate?.toUpperCase().includes(query) ||
          b.plate_number?.toUpperCase().includes(query)
      );

      if (found) {
        setBookingData(found);
        return;
      }
    } catch (err) {}

    // Mock search fallback so demo always works
    const isToken = searchTab === 'token';
    setBookingData({
      id: 'bk-9941',
      cancellation_token: isToken ? query : 'AP-4821',
      booking_number: isToken ? query : 'AP-4821',
      client_name: 'Константин',
      car_model: isToken ? 'Audi RS6 Avant [А 777 АА 77]' : inputValue.trim(),
      service_title: 'Трёхфазная нано-мойка кузова',
      start_time: '2026-10-27T11:00:00+03:00',
      total_price: 2200,
      status: 'pending',
      address: tenant.address,
    });
  };

  const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(tenant.address)}`;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-between pt-4 sm:pt-10">
      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-3xl lg:max-w-4xl px-4 sm:px-6 mb-8 sm:mb-12">
        {/* Back Button (Desktop only, mobile uses bottom navigation bar) */}
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
                    setInputValue('');
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
                    setInputValue('');
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

              {/* Input Form with short, visible placeholder and auto-formatting */}
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder={searchTab === 'plate' ? 'А 777 АА 77' : 'Например, AP-4821'}
                    value={inputValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputValue(searchTab === 'plate' ? val.toUpperCase() : val);
                    }}
                    className={`w-full bg-[#1C1C1E] border border-white/15 rounded-2xl px-4 py-3.5 pl-11 text-sm sm:text-base text-white placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue transition-colors ${
                      searchTab === 'plate' ? 'uppercase font-bold tracking-wider' : 'font-bold uppercase tracking-wider'
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
                  className="sm:w-auto w-full px-8 py-3.5 font-bold"
                >
                  Найти запись
                </GlassButton>
              </form>

              {/* Single concise guidance line right below the field */}
              <p className="mt-3 text-xs text-[#86868B] leading-relaxed">
                Введите госномер авто или индивидуальный номер записи (например, AP-4821) для проверки статуса.
              </p>
            </div>

            {/* Single compact help bar with interactive arrow (no footer duplication) */}
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
          <div className="astryx-card p-5 sm:p-8 md:p-10 bg-[#161618] border border-white/10 rounded-3xl shadow-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/10">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold block mb-1">
                  Токен визита: #{bookingData.booking_number || bookingData.cancellation_token || bookingData.token}
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  {bookingData.service_title || bookingData.serviceTitle}
                </h3>
              </div>
              <Badge
                variant={
                  bookingData.status === 'cancelled'
                    ? 'danger'
                    : bookingData.status === 'completed'
                    ? 'success'
                    : 'warning'
                }
              >
                {bookingData.status === 'cancelled'
                  ? 'Отменена'
                  : bookingData.status === 'completed'
                  ? 'Выполнена'
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
                  {bookingData.car_model || bookingData.carModel}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/60 font-semibold block">
                  Время заезда в бокс
                </span>
                <span className="text-sm sm:text-base font-bold text-accent-blue">
                  {bookingData.timeStr || (bookingData.start_time ? bookingData.start_time.slice(11, 16) : '11:00')}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1">
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

              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-1">
                <span className="text-xs uppercase tracking-wider text-white/60 font-semibold block">
                  К оплате при заезде
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                  {Number(bookingData.total_price || bookingData.servicePrice || 0).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>

            {/* Actions footer */}
            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => setBookingData(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-xs font-semibold text-white transition-colors"
              >
                ← Искать другую запись
              </button>

              {bookingData.status !== 'cancelled' && (
                <button
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

      {/* Studio Footer at the bottom of the page */}
      <Footer tenant={tenant} />

      {/* Floating Bottom Navigation */}
      <FloatingBottomNav />
    </div>
  );
};
