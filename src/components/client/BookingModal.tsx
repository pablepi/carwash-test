import React, { useState, useEffect } from 'react';
import { X, Lock, Car, Phone, User, Warning, Sparkle, Check } from '@phosphor-icons/react';
import { ServiceItem } from './ServiceCatalog';
import { SlotPicker } from './SlotPicker';
import { GlassButton } from '../common/GlassButton';
import { Badge } from '../common/Badge';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { CarCategoryId } from '@/config/siteConfig';
import { TenantConfig } from '@/types/tenant';
import { sendBookingToGoogleSheets, DEFAULT_GOOGLE_SHEETS_URL } from '@/lib/google-sheets';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantConfig;
  initialService: ServiceItem | null;
  onSuccess: (bookingData: any) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  tenant,
  initialService,
  onSuccess,
}) => {
  const { config, selectedCarCategory, setSelectedCarCategory } = useSiteConfig();

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialService?.id || config.services[0]?.id || tenant.services[0]?.id
  );

  useEffect(() => {
    if (initialService?.id) {
      setSelectedServiceId(initialService.id);
    }
  }, [initialService]);

  const activeServiceConfig = config.services.find((s) => s.id === selectedServiceId) || config.services[0];
  const activePrice = activeServiceConfig?.prices[selectedCarCategory] || 1500;
  const activeDuration = activeServiceConfig?.durationMinutes || 45;

  // Adapt to ServiceItem format for SlotPicker
  const adaptedServiceItem: ServiceItem = {
    id: activeServiceConfig.id,
    title: activeServiceConfig.name,
    description: activeServiceConfig.description,
    price: activePrice,
    durationMinutes: activeDuration,
    tags: [activeServiceConfig.badge || 'Мойка', `${activeDuration} мин`],
    category: 'wash',
  };

  const [selectedSlotIso, setSelectedSlotIso] = useState<string>('');
  const [selectedSlotTimeStr, setSelectedSlotTimeStr] = useState<string>('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+7 (');
  const [carModel, setCarModel] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.startsWith('7') || raw.startsWith('8')) {
      raw = raw.substring(1);
    }
    raw = raw.substring(0, 10);
    let formatted = '+7 (';
    if (raw.length > 0) formatted += raw.substring(0, 3);
    if (raw.length >= 3) formatted += ') ' + raw.substring(3, 6);
    if (raw.length >= 6) formatted += '-' + raw.substring(6, 8);
    if (raw.length >= 8) formatted += '-' + raw.substring(8, 10);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedSlotIso) {
      setErrorMsg('Пожалуйста, выберите удобный слот времени для заезда');
      return;
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 11) {
      setErrorMsg('Пожалуйста, укажите полный корректный номер телефона');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Пожалуйста, укажите ваше имя');
      return;
    }

    if (!carModel.trim()) {
      setErrorMsg('Пожалуйста, укажите марку и модель автомобиля');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate booking generation
      await new Promise((res) => setTimeout(res, 400));

      const categoryName = config.carCategories.find((c) => c.id === selectedCarCategory)?.name || 'Легковая';
      const tokenNumber = Math.floor(1000 + Math.random() * 9000);
      const token = `AD-${tokenNumber}`;

      const startDate = selectedSlotIso ? new Date(selectedSlotIso) : new Date();
      const endDate = new Date(startDate.getTime() + activeDuration * 60 * 1000);
      const startTimeIso = !isNaN(startDate.getTime()) ? startDate.toISOString() : new Date().toISOString();
      const endTimeIso = !isNaN(endDate.getTime()) ? endDate.toISOString() : new Date(Date.now() + activeDuration * 60 * 1000).toISOString();
      const formattedPlate = carPlate.trim().toUpperCase();
      const fullCarModel = carModel.trim() + (formattedPlate ? ` [${formattedPlate}]` : '');

      const newBookingData = {
        id: `book-${Date.now()}`,
        token,
        booking_number: token,
        cancellation_token: token,
        tenantSlug: tenant.slug,
        boxId: 'box-1',
        box_id: 'box-1',
        boxName: 'Бокс 1',
        box_name: 'Бокс 1',
        startTimeIso,
        endTimeIso,
        start_time: startTimeIso,
        end_time: endTimeIso,
        timeStr: selectedSlotTimeStr || (startDate ? `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}` : '12:00'),
        serviceTitle: `${activeServiceConfig.name} (${categoryName})`,
        service_title: `${activeServiceConfig.name} (${categoryName})`,
        servicePrice: activePrice,
        total_price: activePrice,
        serviceDurationMinutes: activeDuration,
        clientName: name.trim(),
        client_name: name.trim(),
        clientPhone: phone,
        client_phone: phone,
        carModel: fullCarModel,
        car_model: fullCarModel,
        carPlate: formattedPlate,
        plate_number: formattedPlate,
        carCategory: selectedCarCategory,
        status: 'pending',
        address: tenant.address,
        createdAt: new Date().toISOString(),
      };

      // Save to local storage history
      try {
        const stored = JSON.parse(localStorage.getItem('apex_bookings_history') || '[]');
        localStorage.setItem('apex_bookings_history', JSON.stringify([newBookingData, ...stored]));
      } catch (e) {
        console.error('Failed to save booking to localStorage:', e);
      }

      // Send booking directly to Google Sheets database asynchronously
      const googleSheetsUrl = (config as any).integrations?.googleSheetsUrl || DEFAULT_GOOGLE_SHEETS_URL;
      const dateOnlyStr = startDate ? startDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const timeOnlyStr = selectedSlotTimeStr || (startDate ? `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}` : '12:00');

      sendBookingToGoogleSheets(
        {
          date: dateOnlyStr,
          timeSlot: timeOnlyStr,
          clientName: name.trim(),
          clientPhone: phone,
          carModel: fullCarModel,
          serviceTitle: `${activeServiceConfig.name} (${categoryName})`,
          totalPrice: activePrice,
          booking_number: token,
          cancellation_token: token,
          boxName: 'Бокс 1',
          status: 'pending',
        },
        googleSheetsUrl
      ).catch((e) => console.warn('Google Sheets background sync:', e));

      onSuccess(newBookingData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка бронирования слота. Попробуйте другое время.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="astryx-card w-full max-w-lg bg-[#161618] border border-white/10 shadow-2xl p-5 sm:p-6 relative rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#86868B] hover:text-[#F5F5F7] p-1.5 rounded-full bg-[#1C1C1E] transition-colors z-20"
        >
          <X size={18} />
        </button>

        <div className="mb-4 pr-8">
          <Badge variant="blue" icon={<Lock size={12} weight="fill" />}>
            ОНЛАЙН-ЗАПИСЬ БЕЗ РЕГИСТРАЦИИ
          </Badge>
          <h3 className="text-xl font-extrabold text-[#F5F5F7] tracking-tight mt-2">
            Запись на автомойку
          </h3>
          <p className="text-xs text-[#A1A1A6] mt-0.5">
            Бронь слота подтверждается мгновенно в один клик.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <Warning size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Car Category Switcher inside Modal */}
          <div>
            <label className="block text-[11px] font-mono text-[#F5F5F7] mb-1.5 uppercase tracking-wider font-semibold">
              Категория авто
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1C1C1E] border border-white/[0.08] rounded-xl">
              {config.carCategories.map((cat) => {
                const isSelected = selectedCarCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCarCategory(cat.id as CarCategoryId)}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all select-none flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-accent-blue text-white shadow-sm'
                        : 'text-[#86868B] hover:text-white'
                    }`}
                  >
                    {isSelected && <Check size={11} weight="bold" />}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Service Selector */}
          <div>
            <label className="block text-[11px] font-mono text-[#F5F5F7] mb-1.5 uppercase tracking-wider font-semibold">
              Услуга
            </label>
            <div className="relative">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full bg-[#1C1C1E] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F7] focus:outline-none focus:border-accent-blue appearance-none"
              >
                {config.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.prices[selectedCarCategory]} ₽ ({s.durationMinutes} мин)
                  </option>
                ))}
              </select>
              <Sparkle size={16} className="absolute right-3.5 top-3 text-accent-blue pointer-events-none" />
            </div>
          </div>

          {/* Interactive Date & Slot Selection right inside the modal */}
          <div className="p-3.5 rounded-2xl bg-[#1C1C1E] border border-white/[0.08]">
            <SlotPicker
              tenant={tenant}
              selectedService={adaptedServiceItem}
              selectedSlotIso={selectedSlotIso}
              onSlotSelected={(iso, timeStr) => {
                setSelectedSlotIso(iso);
                setSelectedSlotTimeStr(timeStr);
                setErrorMsg(null);
              }}
              isCompact={true}
            />
          </div>

          {selectedSlotTimeStr && (
            <div className="flex items-center justify-between text-xs font-mono px-1">
              <span className="text-[#A1A1A6]">Выбранное время:</span>
              <span className="font-bold text-accent-blue bg-accent-blue-subtle px-2.5 py-0.5 rounded-md border border-accent-blue/30">
                {selectedSlotTimeStr}
              </span>
            </div>
          )}

          {/* Customer & Car Info */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-mono text-[#F5F5F7] mb-1 uppercase tracking-wider font-semibold">
                Ваше имя
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3 text-[#86868B]" />
                <input
                  type="text"
                  required
                  placeholder="Александр"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#F5F5F7] mb-1 uppercase tracking-wider font-semibold">
                Номер телефона
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-3 text-[#86868B]" />
                <input
                  type="tel"
                  required
                  placeholder="+7 (999) 000-00-00"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-[#1C1C1E] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-mono text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#F5F5F7] mb-1 uppercase tracking-wider font-semibold">
                  Марка и модель авто
                </label>
                <div className="relative">
                  <Car size={16} className="absolute left-3.5 top-3 text-[#86868B]" />
                  <input
                    type="text"
                    required
                    placeholder="BMW 5 / Camry"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/[0.08] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#F5F5F7] mb-1 uppercase tracking-wider font-semibold">
                  Госномер (необязательно)
                </label>
                <input
                  type="text"
                  placeholder="А777АА 777"
                  value={carPlate}
                  onChange={(e) => setCarPlate(e.target.value)}
                  className="w-full bg-[#1C1C1E] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase text-[#F5F5F7] placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue"
                />
              </div>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-mono text-[#86868B] uppercase">К оплате при заезде:</span>
              <span className="text-xl font-bold font-mono text-[#FFFFFF]">
                {activePrice.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
              className="font-bold text-white shadow-lg"
            >
              {isSubmitting ? 'Бронирование...' : 'Подтвердить запись'}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
};
