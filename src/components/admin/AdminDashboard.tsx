import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Clock,
  ClockCounterClockwise,
  Gear,
  Palette,
  Image as ImageIcon,
  CurrencyRub,
  Car,
  Trash,
  Check,
  X,
  SlidersHorizontal,
  Copy,
  MagnifyingGlass,
  ArrowSquareOut,
  Sparkle,
  Phone,
  User,
  MapPin,
  Key,
  Database,
  ArrowsClockwise,
  Code,
  CloudArrowUp,
  CloudArrowDown,
  SignOut,
  Warning,
} from '@phosphor-icons/react';
import { Badge } from '../common/Badge';
import { GlassButton } from '../common/GlassButton';
import { BoxTimeline } from './BoxTimeline';
import { useTenantConfig } from '@/lib/tenant-store';
import { useSiteConfig } from '@/context/SiteConfigContext';
import {
  getAdminCredentials,
  saveAdminCredentials,
  resetAdminCredentialsToEnv,
} from '@/lib/admin-auth';
import {
  DEFAULT_GOOGLE_SHEETS_URL,
  testGoogleSheetsConnection,
  fetchBookingsWithStatus,
  sendBookingToGoogleSheets,
  saveConfigToGoogleSheets,
  fetchConfigFromGoogleSheets,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  RemoteBookingRecord,
} from '@/lib/google-sheets';
import { slugify } from '@/lib/slugify';
import { useNavigate, useParams } from 'react-router-dom';

export interface AdminBooking {
  id: string;
  box_name: string;
  box_id: string;
  client_name: string;
  client_phone: string;
  car_model: string;
  service_title: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'in_progress' | 'completed' | 'done' | 'cancelled';
  date?: string; // "Сегодня", "Завтра" и т.д.
}

interface HistoricalBooking {
  id: string;
  token: string;
  dateStr: string;
  dayLabel: string; // 'Сегодня', 'Вчера', '24 окт', etc.
  time: string;
  clientName: string;
  phone: string;
  carModel: string;
  plate: string;
  serviceTitle: string;
  price: number;
  box: string;
  status: 'completed' | 'in_progress' | 'pending' | 'cancelled' | 'done';
}

// Curated 7-day realistic studio history
const INITIAL_HISTORY: HistoricalBooking[] = [
  // Сегодня
  {
    id: 'h-101',
    token: 'AP-4821',
    dateStr: '2026-10-26',
    dayLabel: 'Сегодня',
    time: '11:00 – 12:30',
    clientName: 'Константин Сафронов',
    phone: '+7 (916) 123-45-67',
    carModel: 'Porsche 911 Carrera 4S',
    plate: 'А 777 АА 777',
    serviceTitle: 'Детейлинг-мойка Премиум (3 фазы)',
    price: 3500,
    box: 'Бокс 1',
    status: 'in_progress',
  },
  {
    id: 'h-102',
    token: 'AP-9104',
    dateStr: '2026-10-26',
    dayLabel: 'Сегодня',
    time: '13:00 – 14:00',
    clientName: 'Михаил Захаров',
    phone: '+7 (925) 333-22-11',
    carModel: 'BMW M5 Competition',
    plate: 'О 555 ОО 77',
    serviceTitle: 'Трёхфазная нано-мойка кузова',
    price: 2200,
    box: 'Бокс 2',
    status: 'pending',
  },
  {
    id: 'h-103',
    token: 'AP-7732',
    dateStr: '2026-10-26',
    dayLabel: 'Сегодня',
    time: '14:30 – 16:00',
    clientName: 'Артём Лебедев',
    phone: '+7 (903) 777-88-99',
    carModel: 'Audi RS6 Avant',
    plate: 'М 999 ММ 99',
    serviceTitle: 'Комплекс кузов + салон',
    price: 2600,
    box: 'Бокс 3',
    status: 'pending',
  },
  {
    id: 'h-104',
    token: 'AP-2910',
    dateStr: '2026-10-26',
    dayLabel: 'Сегодня',
    time: '10:00 – 10:45',
    clientName: 'Илья Кузнецов',
    phone: '+7 (905) 111-22-33',
    carModel: 'Mercedes-Benz E53 AMG',
    plate: 'Р 123 РР 77',
    serviceTitle: 'Экспресс-мойка кузова',
    price: 1400,
    box: 'Бокс 1',
    status: 'completed',
  },
  // Вчера
  {
    id: 'h-105',
    token: 'AP-6520',
    dateStr: '2026-10-25',
    dayLabel: 'Вчера',
    time: '12:00 – 13:30',
    clientName: 'Денис Новиков',
    phone: '+7 (916) 888-00-11',
    carModel: 'Mercedes-AMG GT Coupe',
    plate: 'В 001 ВВ 777',
    serviceTitle: 'Детейлинг-мойка Премиум (3 фазы)',
    price: 3500,
    box: 'Бокс 2',
    status: 'completed',
  },
  {
    id: 'h-106',
    token: 'AP-5419',
    dateStr: '2026-10-25',
    dayLabel: 'Вчера',
    time: '14:00 – 17:30',
    clientName: 'Елена Воронина',
    phone: '+7 (985) 444-55-66',
    carModel: 'Porsche Taycan Cross Turismo',
    plate: 'К 123 ММ 777',
    serviceTitle: 'Керамическое покрытие кузова (2 слоя)',
    price: 18000,
    box: 'Бокс 1',
    status: 'completed',
  },
  {
    id: 'h-107',
    token: 'AP-3982',
    dateStr: '2026-10-25',
    dayLabel: 'Вчера',
    time: '17:30 – 18:15',
    clientName: 'Руслан Мельников',
    phone: '+7 (905) 222-11-00',
    carModel: 'Lexus LC 500',
    plate: 'С 888 СС 199',
    serviceTitle: 'Экспресс-мойка кузова',
    price: 1400,
    box: 'Бокс 3',
    status: 'cancelled',
  },
  // 2 дня назад
  {
    id: 'h-108',
    token: 'AP-8201',
    dateStr: '2026-10-24',
    dayLabel: '24 окт',
    time: '10:30 – 12:00',
    clientName: 'Виктор Семенов',
    phone: '+7 (926) 555-66-77',
    carModel: 'Genesis GV80',
    plate: 'Е 700 ЕЕ 777',
    serviceTitle: 'Комплекс кузов + салон',
    price: 2600,
    box: 'Бокс 1',
    status: 'completed',
  },
  {
    id: 'h-109',
    token: 'AP-1945',
    dateStr: '2026-10-24',
    dayLabel: '24 окт',
    time: '13:00 – 15:30',
    clientName: 'Игорь Романов',
    phone: '+7 (915) 333-44-55',
    carModel: 'BMW X6 M Competition',
    plate: 'Х 007 ХХ 77',
    serviceTitle: 'Химчистка сидений и кожи',
    price: 4500,
    box: 'Бокс 2',
    status: 'completed',
  },
  {
    id: 'h-110',
    token: 'AP-6023',
    dateStr: '2026-10-24',
    dayLabel: '24 окт',
    time: '15:30 – 17:00',
    clientName: 'Павел Титов',
    phone: '+7 (999) 111-22-33',
    carModel: 'Range Rover SV',
    plate: 'Т 777 ТТ 77',
    serviceTitle: 'Трёхфазная нано-мойка кузова',
    price: 2200,
    box: 'Бокс 3',
    status: 'completed',
  },
  // 3 дня назад
  {
    id: 'h-111',
    token: 'AP-4412',
    dateStr: '2026-10-23',
    dayLabel: '23 окт',
    time: '11:30 – 13:00',
    clientName: 'Максим Григорьев',
    phone: '+7 (916) 777-66-55',
    carModel: 'Porsche Cayenne Turbo GT',
    plate: 'А 010 АА 77',
    serviceTitle: 'Детейлинг-мойка Премиум (3 фазы)',
    price: 3500,
    box: 'Бокс 1',
    status: 'completed',
  },
  {
    id: 'h-112',
    token: 'AP-8840',
    dateStr: '2026-10-23',
    dayLabel: '23 окт',
    time: '14:00 – 18:00',
    clientName: 'Олег Борисов',
    phone: '+7 (925) 999-00-11',
    carModel: 'Mercedes-Benz S580 4MATIC',
    plate: 'С 111 СС 99',
    serviceTitle: 'Мягкая восстановительная полировка',
    price: 12000,
    box: 'Бокс 2',
    status: 'completed',
  },
  // 4 дня назад
  {
    id: 'h-113',
    token: 'AP-2319',
    dateStr: '2026-10-22',
    dayLabel: '22 окт',
    time: '12:00 – 13:15',
    clientName: 'Никита Орлов',
    phone: '+7 (909) 888-77-66',
    carModel: 'Zeekr 001 FR',
    plate: 'У 909 УУ 777',
    serviceTitle: 'Трёхфазная нано-мойка кузова',
    price: 2200,
    box: 'Бокс 1',
    status: 'completed',
  },
  {
    id: 'h-114',
    token: 'AP-9051',
    dateStr: '2026-10-22',
    dayLabel: '22 окт',
    time: '15:00 – 16:30',
    clientName: 'Дмитрий Соловьев',
    phone: '+7 (916) 666-55-44',
    carModel: 'BMW M4 Competition (G82)',
    plate: 'М 444 ММ 777',
    serviceTitle: 'Антидождь на все стекла (Aquapel)',
    price: 2500,
    box: 'Бокс 2',
    status: 'completed',
  },
  // 5 дней назад
  {
    id: 'h-115',
    token: 'AP-3118',
    dateStr: '2026-10-21',
    dayLabel: '21 окт',
    time: '10:00 – 11:30',
    clientName: 'Александр Беляев',
    phone: '+7 (915) 222-33-44',
    carModel: 'Porsche Panamera GTS',
    plate: 'Р 777 РР 77',
    serviceTitle: 'Детейлинг-мойка Премиум (3 фазы)',
    price: 3500,
    box: 'Бокс 3',
    status: 'completed',
  },
  {
    id: 'h-116',
    token: 'AP-6409',
    dateStr: '2026-10-21',
    dayLabel: '21 окт',
    time: '13:00 – 17:00',
    clientName: 'Георгий Ковалев',
    phone: '+7 (926) 111-00-99',
    carModel: 'Aston Martin DBX 707',
    plate: 'А 999 АА 777',
    serviceTitle: 'Комплекс кузов + салон',
    price: 2600,
    box: 'Бокс 1',
    status: 'completed',
  },
  // 6 дней назад
  {
    id: 'h-117',
    token: 'AP-5178',
    dateStr: '2026-10-20',
    dayLabel: '20 окт',
    time: '11:00 – 12:30',
    clientName: 'Андрей Ильин',
    phone: '+7 (903) 123-78-90',
    carModel: 'Mercedes-AMG E63s',
    plate: 'В 777 ВВ 77',
    serviceTitle: 'Комплекс кузов + салон',
    price: 2600,
    box: 'Бокс 2',
    status: 'completed',
  },
  {
    id: 'h-118',
    token: 'AP-8490',
    dateStr: '2026-10-20',
    dayLabel: '20 окт',
    time: '14:30 – 15:45',
    clientName: 'Илья Федоров',
    phone: '+7 (916) 999-88-77',
    carModel: 'Audi RS7 Sportback',
    plate: 'К 707 КК 777',
    serviceTitle: 'Трёхфазная нано-мойка кузова',
    price: 2200,
    box: 'Бокс 1',
    status: 'completed',
  },
];

const PRESET_COLORS = [
  { name: 'Бирюзовый (Apple Teal)', hex: '#00C7BE' },
  { name: 'Золотой янтарь (Gold)', hex: '#E5B869' },
  { name: 'Ультрамарин (Cobalt)', hex: '#3B82F6' },
  { name: 'Изумрудный (Emerald)', hex: '#10B981' },
  { name: 'Огненный титан (Orange)', hex: '#F97316' },
  { name: 'Рубиновый спорт (Red)', hex: '#EF4444' },
  { name: 'Королевский фиолетовый', hex: '#8B5CF6' },
];

const PRESET_HERO_PHOTOS = [
  {
    title: 'Porsche 911 (Неоновый свет)',
    url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=1920&auto=format&fit=crop',
  },
  {
    title: 'Audi RS6 Avant (Глянец кузова)',
    url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=1920&auto=format&fit=crop',
  },
  {
    title: 'BMW M4 Competition (Отражения)',
    url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1920&auto=format&fit=crop',
  },
  {
    title: 'Mercedes-AMG GT (Черный сатин)',
    url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=1920&auto=format&fit=crop',
  },
  {
    title: 'Студийный спорткар (Оригинал)',
    url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80',
  },
];

export interface AdminDashboardProps {
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const { config, resetConfig } = useTenantConfig();
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();

  // Single Source of Truth via SiteConfigContext
  const {
    config: siteConfig,
    updateConfig: updateSiteConfig,
    resetConfig: resetSiteConfig,
  } = useSiteConfig();

  // Dynamic car wash slug derived from Admin settings
  const currentSlug = tenantSlug && tenantSlug !== 'apex-detailing' ? tenantSlug : slugify(siteConfig.branding.name || 'carwash');

  // Current main tab: timeline | history | settings
  const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'settings'>('timeline');

  // Timeline view sub-toggle: day | week
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Google Sheets remote bookings & sync state
  const [remoteBookings, setRemoteBookings] = useState<RemoteBookingRecord[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isSyncingConfig, setIsSyncingConfig] = useState(false);
  const [isCopiedScript, setIsCopiedScript] = useState(false);

  const [googleSheetsUrlInput, setGoogleSheetsUrlInput] = useState<string>(() => {
    const raw = (siteConfig as any).integrations?.googleSheetsUrl;
    if (!raw || raw.includes('AKfycbx29aSPAPewTU-NIhljGt3yhgC7tl3YYTvAfxv88DgdfQ06_Jubx4h3E9FrzAT00meGAg')) {
      return DEFAULT_GOOGLE_SHEETS_URL;
    }
    return raw;
  });
  const [isTestingSheets, setIsTestingSheets] = useState(false);
  const [sheetsTestResult, setSheetsTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<{
    error?: string;
    isOldDeployment?: boolean;
    lastSynced?: Date;
  } | null>(null);

  const loadBookingsFromGoogle = useCallback(async () => {
    setIsLoadingRemote(true);
    try {
      const res = await fetchBookingsWithStatus(googleSheetsUrlInput);
      if (res.success) {
        setRemoteBookings(res.bookings);
        setSheetsSyncStatus({ lastSynced: new Date() });
      } else {
        setSheetsSyncStatus({
          error: res.error,
          isOldDeployment: res.isOldDeployment,
        });
      }
    } catch (e: any) {
      console.warn('Failed to load remote bookings:', e);
      setSheetsSyncStatus({ error: e.message || 'Ошибка сети' });
    } finally {
      setIsLoadingRemote(false);
    }
  }, [googleSheetsUrlInput]);

  useEffect(() => {
    loadBookingsFromGoogle();
    const timer = setInterval(() => {
      loadBookingsFromGoogle();
    }, 20000); // Auto-poll Google Sheets every 20 seconds for cross-device sync
    return () => clearInterval(timer);
  }, [loadBookingsFromGoogle]);

  // Sync siteConfig from Google Sheets on initial mount
  useEffect(() => {
    fetchConfigFromGoogleSheets(googleSheetsUrlInput)
      .then((remoteConfig) => {
        if (remoteConfig && typeof remoteConfig === 'object') {
          updateSiteConfig(remoteConfig);
        }
      })
      .catch(() => {});
  }, [googleSheetsUrlInput, updateSiteConfig]);

  // Base timeline bookings for initial display
  const [localTimelineBookings, setLocalTimelineBookings] = useState<AdminBooking[]>(() => {
    const baseBookings: AdminBooking[] = [
      {
        id: 'b-101',
        box_name: 'Бокс 1',
        box_id: 'box-1',
        client_name: 'Константин Сафронов',
        client_phone: '+7 (916) 123-45-67',
        car_model: 'Porsche 911 [А 777 АА 777]',
        service_title: 'Детейлинг-мойка Премиум (3 фазы)',
        start_time: '11:00',
        end_time: '12:30',
        status: 'in_progress',
        date: 'Сегодня',
      },
      {
        id: 'b-102',
        box_name: 'Бокс 2',
        box_id: 'box-2',
        client_name: 'Михаил Захаров',
        client_phone: '+7 (925) 333-22-11',
        car_model: 'BMW M5 [О 555 ОО 77]',
        service_title: 'Трёхфазная нано-мойка',
        start_time: '13:00',
        end_time: '14:00',
        status: 'pending',
        date: 'Сегодня',
      },
      {
        id: 'b-103',
        box_name: 'Бокс 3',
        box_id: 'box-3',
        client_name: 'Артём Лебедев',
        client_phone: '+7 (903) 777-88-99',
        car_model: 'Audi RS6 [М 999 ММ 99]',
        service_title: 'Комплекс кузов + салон',
        start_time: '14:30',
        end_time: '16:00',
        status: 'pending',
        date: 'Сегодня',
      },
    ];

    try {
      const raw = localStorage.getItem('apex_bookings_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const userBookings: AdminBooking[] = parsed.map((b: any, idx: number) => {
            const startH = b.timeStr || (b.start_time ? b.start_time.slice(11, 16) : '12:00');
            const [h, m] = startH.split(':').map(Number);
            const duration = b.serviceDurationMinutes || 60;
            const endTotalMins = (h || 12) * 60 + (m || 0) + duration;
            const endH = Math.floor(endTotalMins / 60) % 24;
            const endM = endTotalMins % 60;
            const endStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

            return {
              id: b.id || `user-b-${idx}`,
              box_name: b.box_name || b.boxName || 'Бокс 1',
              box_id: b.box_id || b.boxId || 'box-1',
              client_name: b.client_name || b.clientName || 'Клиент с сайта',
              client_phone: b.client_phone || b.clientPhone || '+7 (999) 000-00-00',
              car_model: b.car_model || b.carModel || 'Автомобиль',
              service_title: b.service_title || b.serviceTitle || 'Услуга мойки',
              start_time: startH,
              end_time: b.end_time ? b.end_time.slice(11, 16) : endStr,
              status: b.status || 'pending',
              date: 'Сегодня',
            };
          });
          return [...userBookings, ...baseBookings];
        }
      }
    } catch (e) {}

    return baseBookings;
  });

  // Mapped remote bookings from Google Sheets into AdminBooking format
  const mappedRemoteAdminBookings = useMemo((): AdminBooking[] => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    return remoteBookings.map((b) => {
      // Clean start and end times
      const timeStr = String(b.timeSlot || '12:00').trim();
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
      const h = timeMatch ? parseInt(timeMatch[1], 10) : 12;
      const m = timeMatch ? parseInt(timeMatch[2], 10) : 0;
      const startFormatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const endTotalMins = h * 60 + m + 60;
      const endH = Math.floor(endTotalMins / 60) % 24;
      const endM = endTotalMins % 60;
      const endStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      // Clean date label
      let dayLabel = 'Сегодня';
      if (!b.date || b.date === todayStr) {
        dayLabel = 'Сегодня';
      } else if (b.date === tomorrowStr) {
        dayLabel = 'Завтра';
      } else {
        dayLabel = b.date;
      }

      // Clean box name: "1" -> "Бокс 1", "2" -> "Бокс 2"
      const rawBox = String(b.boxName || '1').trim();
      const boxDigits = rawBox.match(/\d+/);
      const boxNum = boxDigits ? boxDigits[0] : '1';
      const cleanBoxName = `Бокс ${boxNum}`;
      const cleanBoxId = `box-${boxNum}`;

      // Clean status
      const s = String(b.status || '').toLowerCase().trim();
      let cleanStatus: AdminBooking['status'] = 'pending';
      if (s === 'in_progress' || s.includes('моется') || s.includes('в работе')) cleanStatus = 'in_progress';
      else if (s === 'completed' || s.includes('готов')) cleanStatus = 'completed';
      else if (s === 'done' || s.includes('завершен')) cleanStatus = 'done';
      else if (s === 'cancelled' || s.includes('отмен')) cleanStatus = 'cancelled';

      return {
        id: b.id || b.booking_number,
        box_name: cleanBoxName,
        box_id: cleanBoxId,
        client_name: b.clientName,
        client_phone: b.clientPhone,
        car_model: b.carModel,
        service_title: b.serviceTitle,
        start_time: startFormatted,
        end_time: endStr,
        status: cleanStatus,
        date: dayLabel,
      };
    });
  }, [remoteBookings]);

  // Combined bookings for Timeline
  const bookings = useMemo((): AdminBooking[] => {
    if (mappedRemoteAdminBookings.length > 0) {
      const remoteIds = new Set(mappedRemoteAdminBookings.map((r) => r.id));
      const localFiltered = localTimelineBookings.filter((b) => !remoteIds.has(b.id));
      return [...mappedRemoteAdminBookings, ...localFiltered];
    }
    return localTimelineBookings;
  }, [mappedRemoteAdminBookings, localTimelineBookings]);

  // New booking form state for manual add
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+7 (');
  const [newCarModel, setNewCarModel] = useState('');
  const [newService, setNewService] = useState(config.services[0]?.title || 'Комплекс кузов + салон');
  const [newBox, setNewBox] = useState('Бокс 1');
  const [newTime, setNewTime] = useState('15:00');

  // History Tab state
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'completed' | 'in_progress' | 'cancelled'>('all');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Combine Google Sheets remote bookings, user-created bookings, and baseline history
  const allHistoryRecords = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const remoteHistory: HistoricalBooking[] = remoteBookings.map((rb, idx) => ({
      id: rb.id,
      token: rb.booking_number && rb.booking_number.length > 3 ? rb.booking_number : `AD-${1000 + idx}`,
      dateStr: rb.date || todayStr,
      dayLabel: rb.date === todayStr ? 'Сегодня' : rb.date === tomorrowStr ? 'Завтра' : (rb.date || 'Сегодня'),
      time: rb.timeSlot,
      clientName: rb.clientName,
      phone: rb.clientPhone,
      carModel: rb.carModel,
      plate: rb.carModel?.includes('[') ? (rb.carModel.match(/\[(.*?)\]/) || ['', ''])[1] : '',
      serviceTitle: rb.serviceTitle,
      price: rb.totalPrice,
      box: rb.boxName,
      status: rb.status,
    }));

    let localBookings: HistoricalBooking[] = [];
    try {
      const raw = localStorage.getItem('apex_bookings_history');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localBookings = parsed.map((item: any, idx: number) => ({
            id: `local-${idx}-${item.id || Date.now()}`,
            token: item.booking_number || item.cancellation_token || item.token || `AP-${4000 + idx}`,
            dateStr: item.start_time ? item.start_time.slice(0, 10) : (item.startTimeIso ? item.startTimeIso.slice(0, 10) : '2026-10-26'),
            dayLabel: 'Сегодня',
            time: item.timeStr || (item.start_time ? item.start_time.slice(11, 16) : '12:00'),
            clientName: item.client_name || item.clientName || 'Клиент с сайта',
            phone: item.client_phone || item.clientPhone || '+7 (999) 000-00-00',
            carModel: item.car_model || item.carModel || 'Автомобиль',
            plate: item.plate_number || item.carPlate || 'А 777 АА 77',
            serviceTitle: item.service_title || item.serviceTitle || 'Услуга студии',
            price: Number(item.total_price || item.servicePrice) || 2500,
            box: item.box_name || item.boxName || 'Бокс 1',
            status: (item.status === 'cancelled' ? 'cancelled' : 'in_progress') as any,
          }));
        }
      }
    } catch (e) {}

    const seenIds = new Set<string>();
    const result: HistoricalBooking[] = [];
    for (const item of [...remoteHistory, ...localBookings, ...INITIAL_HISTORY]) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        result.push(item);
      }
    }
    return result;
  }, [remoteBookings]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    return allHistoryRecords.filter((rec) => {
      // Status filter
      if (historyStatusFilter !== 'all') {
        if (historyStatusFilter === 'completed' && rec.status !== 'completed') return false;
        if (historyStatusFilter === 'in_progress' && rec.status !== 'in_progress') return false;
        if (historyStatusFilter === 'cancelled' && rec.status !== 'cancelled') return false;
      }
      // Text query filter
      if (!q) return true;
      return (
        rec.token.toLowerCase().includes(q) ||
        rec.carModel.toLowerCase().includes(q) ||
        rec.plate.toLowerCase().includes(q) ||
        rec.clientName.toLowerCase().includes(q) ||
        rec.phone.toLowerCase().includes(q) ||
        rec.serviceTitle.toLowerCase().includes(q)
      );
    });
  }, [allHistoryRecords, historySearch, historyStatusFilter]);

  // History 7-day metrics
  const historyMetrics = useMemo(() => {
    const completed = allHistoryRecords.filter((r) => r.status === 'completed');
    const totalRev = completed.reduce((acc, r) => acc + r.price, 0);
    const avgCheck = completed.length > 0 ? Math.round(totalRev / completed.length) : 0;
    const cancelledCount = allHistoryRecords.filter((r) => r.status === 'cancelled').length;
    return {
      totalRev,
      totalCount: allHistoryRecords.length,
      completedCount: completed.length,
      avgCheck,
      cancelledCount,
    };
  }, [allHistoryRecords]);

// Single Source of Truth already initialized at top

  // Branding states
  const [brandingName, setBrandingName] = useState(siteConfig.branding.name);
  const [brandingTagline, setBrandingTagline] = useState(siteConfig.branding.tagline);
  const [heroTitle, setHeroTitle] = useState(siteConfig.branding.heroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(siteConfig.branding.heroSubtitle);
  const [heroImageInput, setHeroImageInput] = useState(siteConfig.branding.heroImageUrl);

  // Contacts states
  const [contactsCity, setContactsCity] = useState(siteConfig.contacts.city);
  const [contactsAddress, setContactsAddress] = useState(siteConfig.contacts.address);
  const [contactsPhone, setContactsPhone] = useState(siteConfig.contacts.phone);
  const [contactsHours, setContactsHours] = useState(siteConfig.contacts.workingHours);
  const [contactsYandex, setContactsYandex] = useState(siteConfig.contacts.yandexMapsUrl);
  const [contactsTelegram, setContactsTelegram] = useState(siteConfig.contacts.telegramUrl || '');
  const [contactsMax, setContactsMax] = useState((siteConfig.contacts as any).maxUrl || siteConfig.contacts.whatsappUrl || '');

  // Workflow states: Boxes count, hours, buffer, slot step
  const [boxesCountInput, setBoxesCountInput] = useState<number>(siteConfig.workflow.boxesCount || 2);
  const [openingHourInput, setOpeningHourInput] = useState<string>(siteConfig.workflow.openingHour || '08:00');
  const [closingHourInput, setClosingHourInput] = useState<string>(siteConfig.workflow.closingHour || '22:00');
  const [bufferMinutesInput, setBufferMinutesInput] = useState<number>(siteConfig.workflow.bufferMinutes ?? 10);
  const [slotStepMinutesInput, setSlotStepMinutesInput] = useState<number>(siteConfig.workflow.slotStepMinutes || 30);

  // Theme states
  const [accentColorInput, setAccentColorInput] = useState<string>(siteConfig.theme.accentColor || '#10B981');
  const [customColorText, setCustomColorText] = useState<string>(siteConfig.theme.accentColor || '#10B981');

  // Services list (with sedan, crossover, suv prices)
  const [siteServicesList, setSiteServicesList] = useState(siteConfig.services);

  // Admin credentials state (env with local override or synced config)
  const initialCreds = (siteConfig as any).adminAuth || getAdminCredentials();
  const [adminLoginInput, setAdminLoginInput] = useState(initialCreds.login || 'admin');
  const [adminPasswordInput, setAdminPasswordInput] = useState(initialCreds.password || 'admin123');
  const [isCredsCustom, setIsCredsCustom] = useState(
    Boolean((siteConfig as any).adminAuth?.password) || initialCreds.isCustom
  );

  const handleTestSheets = async () => {
    setIsTestingSheets(true);
    setSheetsTestResult(null);
    try {
      const res = await testGoogleSheetsConnection(googleSheetsUrlInput);
      setSheetsTestResult(res);
      if (res.ok) {
        showToast('Связь с Google Таблицей подтверждена!');
        loadBookingsFromGoogle();
      } else {
        showToast('Не удалось связаться с Google Таблицей');
      }
    } catch (e: any) {
      setSheetsTestResult({ ok: false, message: e.message || 'Ошибка подключения' });
    } finally {
      setIsTestingSheets(false);
    }
  };

  const handleSaveGoogleSheetsUrl = () => {
    updateSiteConfig({
      integrations: {
        googleSheetsUrl: googleSheetsUrlInput.trim(),
      },
    });
    showToast('Ссылка на Google Таблицу успешно сохранена');
    loadBookingsFromGoogle();
  };

  const handleSyncConfigToSheets = async () => {
    setIsSyncingConfig(true);
    try {
      const res = await saveConfigToGoogleSheets(siteConfig, googleSheetsUrlInput);
      if (res.success) {
        showToast('Настройки сайта успешно сохранены в Google Таблицу!');
      } else {
        showToast(res.message || 'Ошибка сохранения настроек');
      }
    } catch (e: any) {
      showToast('Ошибка сохранения настроек');
    } finally {
      setIsSyncingConfig(false);
    }
  };

  const handleLoadConfigFromSheets = async () => {
    setIsSyncingConfig(true);
    try {
      const remote = await fetchConfigFromGoogleSheets(googleSheetsUrlInput);
      if (remote) {
        updateSiteConfig(remote);
        if (remote.branding?.name) setBrandingName(remote.branding.name);
        if (remote.branding?.heroTitle) setHeroTitle(remote.branding.heroTitle);
        if (remote.theme?.accentColor) {
          setAccentColorInput(remote.theme.accentColor);
          setCustomColorText(remote.theme.accentColor);
        }
        showToast('Настройки загружены из Google Таблицы!');
      } else {
        showToast('Настройки в таблице пока не найдены');
      }
    } catch (e: any) {
      showToast('Ошибка загрузки настроек');
    } finally {
      setIsSyncingConfig(false);
    }
  };

  // New service form state
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcDesc, setNewSvcDesc] = useState('');
  const [newSvcBadge, setNewSvcBadge] = useState('Хит');
  const [newSvcDuration, setNewSvcDuration] = useState('60');
  const [newSvcPriceSedan, setNewSvcPriceSedan] = useState('1600');
  const [newSvcPriceCrossover, setNewSvcPriceCrossover] = useState('1900');
  const [newSvcPriceSuv, setNewSvcPriceSuv] = useState('2200');

  // Handle Box Timeline Status & Movement
  const handleStatusChange = (id: string, newStatus: AdminBooking['status']) => {
    setLocalTimelineBookings((prev: AdminBooking[]) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    setRemoteBookings((prev: RemoteBookingRecord[]) =>
      prev.map((b) => (b.id === id || b.booking_number === id ? { ...b, status: newStatus } : b))
    );
  };

  const handleMoveBooking = (id: string, newBoxName: string, newStartTime: string) => {
    setLocalTimelineBookings((prev: AdminBooking[]) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const [h, m] = newStartTime.split(':').map(Number);
        const endH = h + 1;
        const endStr = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return {
          ...b,
          box_name: newBoxName,
          box_id: `box-${newBoxName.replace(/\D/g, '') || '1'}`,
          start_time: newStartTime,
          end_time: endStr,
        };
      })
    );
  };

  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newCarModel) return;

    const [h, m] = newTime.split(':').map(Number);
    const endH = h + 1;
    const endStr = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    const newBooking: AdminBooking = {
      id: `b-${Date.now()}`,
      box_name: newBox,
      box_id: `box-${newBox.replace(/\D/g, '') || '1'}`,
      client_name: newClientName,
      client_phone: newClientPhone,
      car_model: newCarModel,
      service_title: newService,
      start_time: newTime,
      end_time: endStr,
      status: 'pending',
      date: 'Сегодня',
    };

    setLocalTimelineBookings((prev) => [newBooking, ...prev]);

    // Send to Google Sheets database asynchronously
    const todayStr = new Date().toISOString().slice(0, 10);
    sendBookingToGoogleSheets(
      {
        date: todayStr,
        timeSlot: newTime,
        clientName: newClientName.trim(),
        clientPhone: newClientPhone.trim(),
        carModel: newCarModel.trim(),
        serviceTitle: newService,
        totalPrice: 2000,
        booking_number: `AD-${Math.floor(1000 + Math.random() * 9000)}`,
        boxName: newBox,
        status: 'pending',
      },
      googleSheetsUrlInput
    )
      .then(() => {
        loadBookingsFromGoogle();
      })
      .catch(() => {});

    setIsAddModalOpen(false);
    setNewClientName('');
    setNewCarModel('');
    showToast('Запись успешно добавлена в сетку');
  };

  // Copy token helper
  const handleCopyToken = (tok: string) => {
    navigator.clipboard.writeText(tok);
    setCopiedToken(tok);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Settings Save Handlers for SiteConfig
  const handleSaveBoxes = (count: number) => {
    setBoxesCountInput(count);
    updateSiteConfig({ workflow: { ...siteConfig.workflow, boxesCount: count } });
    showToast(`Количество боксов обновлено: ${count}`);
  };

  const handleSaveHours = (opening: string, closing: string) => {
    setOpeningHourInput(opening);
    setClosingHourInput(closing);
    const hoursStr = `Ежедневно: ${opening} — ${closing}`;
    setContactsHours(hoursStr);
    updateSiteConfig({
      workflow: {
        ...siteConfig.workflow,
        openingHour: opening,
        closingHour: closing,
      },
      contacts: {
        ...siteConfig.contacts,
        workingHours: hoursStr,
      },
    });
    showToast(`Время записи обновлено: ${opening} — ${closing}`);
  };

  const handleSaveBuffer = (mins: number) => {
    setBufferMinutesInput(mins);
    updateSiteConfig({ workflow: { ...siteConfig.workflow, bufferMinutes: mins } });
    showToast(`Буфер между авто: ${mins} мин`);
  };

  const handleSaveSlotStep = (step: number) => {
    setSlotStepMinutesInput(step);
    updateSiteConfig({ workflow: { ...siteConfig.workflow, slotStepMinutes: step } });
    showToast(`Шаг сетки слотов: ${step} мин`);
  };

  const handleApplyColor = (colorHex: string) => {
    setAccentColorInput(colorHex);
    setCustomColorText(colorHex);
    updateSiteConfig({ theme: { ...siteConfig.theme, accentColor: colorHex } });
    showToast(`Главный цвет сайта обновлен на ${colorHex}`);
  };

  const handleApplyHeroImage = (url: string) => {
    setHeroImageInput(url);
    updateSiteConfig({ branding: { ...siteConfig.branding, heroImageUrl: url } });
    showToast('Фото главного экрана обновлено');
  };

  const handleServiceFieldChange = (
    id: string,
    field: 'name' | 'durationMinutes' | 'badge' | 'description',
    val: any
  ) => {
    setSiteServicesList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleServicePriceChange = (
    id: string,
    category: 'sedan' | 'crossover' | 'suv',
    val: number
  ) => {
    setSiteServicesList((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, prices: { ...s.prices, [category]: val } } : s
      )
    );
  };

  const handleDeleteService = (id: string) => {
    if (siteServicesList.length <= 1) {
      alert('В каталоге должна оставаться хотя бы одна услуга.');
      return;
    }
    const updated = siteServicesList.filter((s) => s.id !== id);
    setSiteServicesList(updated);
    updateSiteConfig({ services: updated });
    showToast('Услуга удалена из каталога');
  };

  const handleAddNewService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSvcName.trim()) return;

    const newSvc = {
      id: `svc-${Date.now()}`,
      name: newSvcName.trim(),
      description: newSvcDesc.trim() || 'Качественная мойка и уход за автомобилем.',
      durationMinutes: Number(newSvcDuration) || 45,
      badge: newSvcBadge || undefined,
      prices: {
        sedan: Number(newSvcPriceSedan) || 1600,
        crossover: Number(newSvcPriceCrossover) || 1900,
        suv: Number(newSvcPriceSuv) || 2200,
      },
    };

    const updated = [newSvc, ...siteServicesList];
    setSiteServicesList(updated);
    updateSiteConfig({ services: updated });
    setIsAddServiceOpen(false);
    setNewSvcName('');
    setNewSvcDesc('');
    showToast(`Услуга "${newSvc.name}" добавлена в прайс-лист`);
  };

  const handleSaveAllSettings = () => {
    updateSiteConfig({
      branding: {
        ...siteConfig.branding,
        name: brandingName,
        tagline: brandingTagline,
        heroTitle,
        heroSubtitle,
        heroImageUrl: heroImageInput,
      },
      contacts: {
        ...siteConfig.contacts,
        city: contactsCity,
        address: contactsAddress,
        phone: contactsPhone,
        workingHours: contactsHours,
        yandexMapsUrl: contactsYandex,
        telegramUrl: contactsTelegram || undefined,
        whatsappUrl: contactsMax || undefined,
        maxUrl: contactsMax || undefined,
      },
      workflow: {
        ...siteConfig.workflow,
        boxesCount: boxesCountInput,
        openingHour: openingHourInput,
        closingHour: closingHourInput,
        bufferMinutes: bufferMinutesInput,
        slotStepMinutes: slotStepMinutesInput,
      },
      theme: {
        ...siteConfig.theme,
        accentColor: accentColorInput,
      },
      services: siteServicesList,
      integrations: {
        googleSheetsUrl: googleSheetsUrlInput.trim(),
      },
    });
    showToast('Все настройки и тарифы успешно сохранены');
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminLoginInput.trim() || !adminPasswordInput.trim()) {
      alert('Логин и пароль не могут быть пустыми');
      return;
    }
    saveAdminCredentials(adminLoginInput, adminPasswordInput);
    setIsCredsCustom(true);

    const updatedConfig = {
      ...siteConfig,
      adminAuth: {
        login: adminLoginInput.trim(),
        password: adminPasswordInput.trim(),
      },
    };
    updateSiteConfig(updatedConfig);
    saveConfigToGoogleSheets(updatedConfig, googleSheetsUrlInput).catch((err) =>
      console.warn('Could not sync adminAuth to sheets:', err)
    );
    showToast('Логин и пароль успешно сохранены и синхронизированы!');
  };

  const handleResetCredentials = () => {
    const envCreds = resetAdminCredentialsToEnv();
    setAdminLoginInput(envCreds.login);
    setAdminPasswordInput(envCreds.password);
    setIsCredsCustom(false);

    const updatedConfig = {
      ...siteConfig,
      adminAuth: {
        login: envCreds.login,
        password: envCreds.password,
      },
    };
    updateSiteConfig(updatedConfig);
    saveConfigToGoogleSheets(updatedConfig, googleSheetsUrlInput).catch(() => {});
    showToast('Пароль сброшен к значениям по умолчанию и синхронизирован');
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Сбросить все настройки автомойки к исходным?')) {
      resetSiteConfig();
      resetConfig();
      setBrandingName('AquaDrive');
      setBrandingTagline('Быстрая мойка кузова и салона без очередей');
      setHeroTitle('Бережная мойка без царапин и разводов');
      setHeroSubtitle('Профессиональная химия, умягчённая вода и турбосушка тёплым воздухом.');
      setHeroImageInput('https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80');
      setAccentColorInput('#00C7BE');
      setCustomColorText('#00C7BE');
      setBoxesCountInput(2);
      setOpeningHourInput('08:00');
      setClosingHourInput('22:00');
      setBufferMinutesInput(10);
      setSlotStepMinutesInput(30);
      setSiteServicesList(siteConfig.services);
      showToast('Настройки сброшены к стандартным');
    }
  };

  const activeBookings = viewMode === 'day'
    ? bookings.filter((b) => b.date === 'Сегодня' || b.date === new Date().toISOString().slice(0, 10))
    : bookings;

  const inProgressCount = activeBookings.filter((b) => b.status === 'in_progress').length;
  const completedCount = activeBookings.filter((b) => b.status === 'completed').length;
  const pendingCount = activeBookings.filter((b) => b.status === 'pending').length;
  const totalCount = activeBookings.filter((b) => b.status !== 'cancelled').length;

  return (
    <div className="min-h-screen bg-base-darkest text-text-primary pb-28 pt-4 sm:pt-6 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-[#1C1C1E] border border-white/20 px-4 py-3 shadow-2xl backdrop-blur-md animate-fade-in-up">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent-blue/20 text-accent-blue">
            <Check size={16} weight="bold" />
          </div>
          <span className="text-xs font-semibold text-white">{toastMessage}</span>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="blue" icon={<ShieldCheck size={14} weight="fill" />}>
                Панель управления
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {activeTab === 'timeline' && 'Смена и таймлайн боксов'}
              {activeTab === 'history' && 'История записей за неделю'}
              {activeTab === 'settings' && 'Настройки и оформление студии'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View client website button */}
            <button
              onClick={loadBookingsFromGoogle}
              disabled={isLoadingRemote}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-xs font-semibold text-text-secondary hover:text-white transition-all disabled:opacity-50"
              title="Обновить записи из Google Таблицы"
            >
              <ArrowsClockwise size={15} className={isLoadingRemote ? 'animate-spin text-accent-blue' : ''} />
              <span className="hidden sm:inline">Таблица:</span>
              <span className="text-accent-blue font-bold">
                {remoteBookings.length > 0 ? `${remoteBookings.length} записей` : 'Синхронизировать'}
              </span>
            </button>

            <button
              onClick={() => navigate(`/s/${currentSlug}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-xs font-semibold text-text-secondary hover:text-white transition-colors"
            >
              <span>Сайт (/s/{currentSlug})</span>
              <ArrowSquareOut size={15} />
            </button>

            {/* Main Tabs Navigation */}
            <div className="flex rounded-xl bg-[#161618] border border-white/10 p-1">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'timeline'
                    ? 'bg-accent-blue text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <Clock size={16} weight={activeTab === 'timeline' ? 'bold' : 'regular'} />
                <span>Боксы</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'history'
                    ? 'bg-accent-blue text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <ClockCounterClockwise size={16} weight={activeTab === 'history' ? 'bold' : 'regular'} />
                <span>История</span>
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                  7 дн
                </span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'settings'
                    ? 'bg-accent-blue text-white shadow-md'
                    : 'text-text-secondary hover:text-white'
                }`}
              >
                <Gear size={16} weight={activeTab === 'settings' ? 'bold' : 'regular'} />
                <span>Настройки</span>
              </button>
            </div>

            {props.onLogout && (
              <button
                onClick={props.onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 hover:text-red-300 transition-all"
                title="Выйти из аккаунта администратора"
              >
                <SignOut size={15} />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            )}
          </div>
        </div>

        {/* Old Deployment Warning Banner */}
        {sheetsSyncStatus?.isOldDeployment && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <div className="flex items-start gap-3">
              <Warning size={22} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5 flex-1">
                <div className="font-bold text-amber-300 text-sm">
                  В Google Apps Script всё ещё работает старая версия развертывания!
                </div>
                <div>
                  Бронирования с сайта успешно попадают в Google Таблицу, но <b>не могут передаться обратно на ноутбук</b>,
                  так как старый скрипт возвращает ошибку: <code>«Параметр 'date' обязателен»</code>.
                </div>
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition-colors"
                  >
                    Посмотреть инструкцию и код скрипта во вкладке «Настройки» →
                  </button>
                  <button
                    onClick={loadBookingsFromGoogle}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                  >
                    Проверить снова
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: TIMELINE & CURRENT BOOKINGS */}
        {activeTab === 'timeline' && (
          <div>
            {/* Quick Actions Row */}
            <div className="flex items-center justify-between gap-3 mb-5">
              {/* Day / Week Switcher */}
              <div className="flex rounded-xl bg-[#161618] border border-white/10 p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                    viewMode === 'day'
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Сегодня
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                    viewMode === 'week'
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Неделя
                </button>
              </div>

              {/* Manual booking add trigger */}
              <GlassButton
                variant="primary"
                size="sm"
                icon={<Plus size={16} weight="bold" />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Новая запись
              </GlassButton>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
              <div className="astryx-card p-3.5 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] font-mono text-text-secondary uppercase">
                  {viewMode === 'day' ? 'Всего сегодня' : 'Всего в сетке'}
                </span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold tabular-nums text-text-primary mt-1">
                  {totalCount}
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">автомобилей</span>
              </div>

              <div className="astryx-card p-3.5 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] font-mono text-text-secondary uppercase">Моются</span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold tabular-nums text-accent-blue mt-1">
                  {inProgressCount}
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">в {config.boxesCount || 3} боксах</span>
              </div>

              <div className="astryx-card p-3.5 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] font-mono text-text-secondary uppercase">Готовы</span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold tabular-nums text-emerald-400 mt-1">
                  {completedCount}
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">к выдаче</span>
              </div>

              <div className="astryx-card p-3.5 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] font-mono text-text-secondary uppercase">Ожидают</span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold tabular-nums text-amber-400 mt-1">
                  {pendingCount}
                </span>
                <span className="text-[10px] font-mono text-text-tertiary">заезда</span>
              </div>
            </div>

            {/* Timeline with dynamic boxesCount */}
            <BoxTimeline
              bookings={activeBookings}
              onStatusChange={handleStatusChange}
              onMoveBooking={handleMoveBooking}
              boxesCount={config.boxesCount || 3}
            />
          </div>
        )}

        {/* TAB 2: HISTORY OF BOOKINGS (PAST WEEK) */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* 4 Summary Metrics for the past week */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="astryx-card p-4 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] uppercase tracking-wider text-[#A1A1A6] font-mono">
                  Выручка за 7 дней
                </span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold text-emerald-400 mt-1 tabular-nums">
                  {historyMetrics.totalRev.toLocaleString('ru-RU')} ₽
                </span>
                <span className="text-[11px] text-[#86868B]">по выполненным визитам</span>
              </div>

              <div className="astryx-card p-4 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] uppercase tracking-wider text-[#A1A1A6] font-mono">
                  Всего визитов
                </span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold text-white mt-1 tabular-nums">
                  {historyMetrics.totalCount} авто
                </span>
                <span className="text-[11px] text-[#86868B]">за прошедшую неделю</span>
              </div>

              <div className="astryx-card p-4 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] uppercase tracking-wider text-[#A1A1A6] font-mono">
                  Выполнено успешно
                </span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold text-accent-blue mt-1 tabular-nums">
                  {historyMetrics.completedCount}
                </span>
                <span className="text-[11px] text-[#86868B]">
                  {Math.round((historyMetrics.completedCount / historyMetrics.totalCount) * 100)}% успешных броней
                </span>
              </div>

              <div className="astryx-card p-4 bg-[#161618] border border-white/10 rounded-2xl">
                <span className="block text-[11px] uppercase tracking-wider text-[#A1A1A6] font-mono">
                  Средний чек
                </span>
                <span className="block font-mono text-xl sm:text-2xl font-extrabold text-white mt-1 tabular-nums">
                  {historyMetrics.avgCheck.toLocaleString('ru-RU')} ₽
                </span>
                <span className="text-[11px] text-[#86868B]">отменено: {historyMetrics.cancelledCount}</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="astryx-card p-4 bg-[#161618] border border-white/10 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                {/* Search input */}
                <div className="relative flex-1">
                  <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-[#86868B]" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Поиск по номеру записи (AP-...), госномеру, авто или клиенту..."
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch('')}
                      className="absolute right-3 top-2.5 text-[#86868B] hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Status filter buttons */}
                <div className="flex rounded-xl bg-[#1C1C1E] border border-white/10 p-1 shrink-0 overflow-x-auto">
                  {(
                    [
                      { key: 'all', label: 'Все' },
                      { key: 'completed', label: 'Готовы' },
                      { key: 'in_progress', label: 'В работе' },
                      { key: 'cancelled', label: 'Отменены' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setHistoryStatusFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        historyStatusFilter === f.key
                          ? 'bg-accent-blue text-white shadow-sm'
                          : 'text-[#86868B] hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bookings List / Cards */}
            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="astryx-card p-8 bg-[#161618] border border-white/10 rounded-2xl text-center">
                  <Car size={36} className="mx-auto text-[#6E6E73] mb-2" />
                  <p className="text-sm font-semibold text-white">Ничего не найдено</p>
                  <p className="text-xs text-[#86868B] mt-1">
                    Попробуйте изменить поисковый запрос или фильтр статуса
                  </p>
                </div>
              ) : (
                filteredHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="astryx-card p-4 sm:p-5 bg-[#161618] hover:bg-[#1C1C1E] border border-white/10 rounded-2xl transition-all duration-150"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Token, Car, Plate */}
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white/[0.05] border border-white/10 shrink-0">
                          <button
                            onClick={() => handleCopyToken(rec.token)}
                            className="group flex items-center gap-1 font-mono font-bold text-xs sm:text-sm text-accent-blue hover:underline"
                            title="Скопировать номер записи"
                          >
                            <span>{rec.token}</span>
                            <Copy size={13} className="opacity-60 group-hover:opacity-100" />
                          </button>
                          <span className="text-[10px] font-mono text-[#86868B] mt-0.5">
                            {copiedToken === rec.token ? 'Скопировано!' : rec.dayLabel}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-bold text-white">
                              {rec.carModel}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[11px] font-mono font-bold text-white tracking-wider">
                              {rec.plate}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#86868B] mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-[#F5F5F7]">
                              <User size={13} className="text-[#86868B]" />
                              {rec.clientName}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[#A1A1A6]">
                              <Phone size={13} className="text-[#86868B]" />
                              {rec.phone}
                            </span>
                            <span className="text-accent-blue font-medium">{rec.box}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Service, Time, Price, Status */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                        <div className="text-left sm:text-right">
                          <span className="block text-xs sm:text-sm font-semibold text-white">
                            {rec.serviceTitle}
                          </span>
                          <span className="block text-[11px] font-mono text-[#86868B] mt-0.5">
                            {rec.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-mono font-bold text-sm sm:text-base text-white tabular-nums">
                            {rec.price.toLocaleString('ru-RU')} ₽
                          </span>
                          {rec.status === 'completed' && <Badge variant="success">Завершена</Badge>}
                          {rec.status === 'in_progress' && <Badge variant="blue">В работе</Badge>}
                          {rec.status === 'pending' && <Badge variant="warning">Ожидает</Badge>}
                          {rec.status === 'cancelled' && <Badge variant="danger">Отменена</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WHITE-LABEL & STUDIO SETTINGS */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* TOP BAR */}
            <div className="astryx-card p-5 sm:p-6 bg-[#161618] border border-white/10 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Настройки автомойки
                </h2>
                <p className="text-xs text-[#86868B] mt-1">
                  Управление контактами, боксами и ценами.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveAllSettings}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-accent-blue hover:brightness-110 text-white text-xs sm:text-sm font-bold transition-all shadow-md active:scale-95 self-start sm:self-auto"
              >
                <Check size={16} weight="bold" />
                <span>Сохранить всё</span>
              </button>
            </div>

            {/* SECTION 1: BRANDING & HEADERS */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkle size={18} className="text-accent-blue" weight="bold" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Брендинг и тексты первого экрана
                </h2>
              </div>
              <p className="text-xs text-[#86868B] mb-5">
                Название студии, слоган и заголовки для мгновенной адаптации под любой бренд автомойки.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Название автомойки
                  </label>
                  <input
                    type="text"
                    value={brandingName}
                    onChange={(e) => setBrandingName(e.target.value)}
                    placeholder="AquaDrive"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-accent-blue"
                  />
                  <div className="mt-2 flex items-center justify-between text-[11px] bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                    <span className="text-[#86868B] truncate">
                      Адрес сайта:{' '}
                      <span className="font-mono text-accent-blue font-semibold">
                        /s/{slugify(brandingName || 'carwash')}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/s/${slugify(brandingName || 'carwash')}`)}
                      className="text-accent-blue hover:underline inline-flex items-center gap-1 shrink-0 ml-2 font-medium"
                    >
                      <span>Открыть</span>
                      <ArrowSquareOut size={12} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Фирменный слоган
                  </label>
                  <input
                    type="text"
                    value={brandingTagline}
                    onChange={(e) => setBrandingTagline(e.target.value)}
                    placeholder="Быстрая мойка кузова и салона без очередей"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Главный заголовок Hero-экрана
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Бережная мойка без царапин и разводов"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Подзаголовок Hero-экрана
                  </label>
                  <textarea
                    rows={2}
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Профессиональная химия, умягчённая вода и турбосушка тёплым воздухом..."
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: ACCENT COLOR SELECTION */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Palette size={18} className="text-accent-blue" weight="bold" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Главный акцентный цвет сайта
                </h2>
              </div>
              <p className="text-xs text-[#86868B] mb-5">
                Мгновенно перекрашивает кнопки, подсветку, бейджи, иконки и свечение по всему сайту и в панели клиента.
              </p>

              {/* Color Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mb-5">
                {PRESET_COLORS.map((p) => {
                  const isSelected = accentColorInput.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => handleApplyColor(p.hex)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-white bg-white/10 shadow-lg'
                          : 'border-white/10 bg-[#1C1C1E] hover:border-white/20'
                      }`}
                    >
                      <div
                        className="h-7 w-7 rounded-full shadow-inner shrink-0 border border-white/20"
                        style={{ backgroundColor: p.hex }}
                      />
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-white truncate">{p.name}</span>
                        <span className="block text-[10px] font-mono text-[#86868B]">{p.hex}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#1C1C1E] border border-white/10">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColorInput}
                    onChange={(e) => {
                      setAccentColorInput(e.target.value);
                      setCustomColorText(e.target.value);
                      handleApplyColor(e.target.value);
                    }}
                    className="h-10 w-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-white">Свой оттенок (HEX)</span>
                    <input
                      type="text"
                      value={customColorText}
                      onChange={(e) => setCustomColorText(e.target.value)}
                      placeholder="#10B981"
                      className="bg-transparent text-xs font-mono text-[#A1A1A6] focus:text-white focus:outline-none uppercase"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyColor(customColorText)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md"
                  style={{ backgroundColor: accentColorInput }}
                >
                  Применить этот цвет
                </button>
              </div>
            </div>

            {/* SECTION 3: CONTACTS & SCHEDULE */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-accent-blue" weight="bold" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Контакты, адрес и режим работы
                </h2>
              </div>
              <p className="text-xs text-[#86868B] mb-5">
                Отображаются в шапке, подвале и контактах для быстрой связи клиента.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Город
                  </label>
                  <input
                    type="text"
                    value={contactsCity}
                    onChange={(e) => setContactsCity(e.target.value)}
                    placeholder="Москва"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Телефон
                  </label>
                  <input
                    type="text"
                    value={contactsPhone}
                    onChange={(e) => setContactsPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Полный адрес мойки
                  </label>
                  <input
                    type="text"
                    value={contactsAddress}
                    onChange={(e) => setContactsAddress(e.target.value)}
                    placeholder="г. Москва, ул. Автозаводская, д. 23, корп. 7"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Часы работы
                  </label>
                  <input
                    type="text"
                    value={contactsHours}
                    onChange={(e) => setContactsHours(e.target.value)}
                    placeholder="Ежедневно: 08:00 — 22:00"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Маршрут в Яндекс.Картах (URL)
                  </label>
                  <input
                    type="url"
                    value={contactsYandex}
                    onChange={(e) => setContactsYandex(e.target.value)}
                    placeholder="https://yandex.ru/maps/..."
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Telegram (URL или @канал)
                  </label>
                  <input
                    type="text"
                    value={contactsTelegram}
                    onChange={(e) => setContactsTelegram(e.target.value)}
                    placeholder="https://t.me/aquadrive_wash"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Мессенджер MAX (ссылка)
                  </label>
                  <input
                    type="text"
                    value={contactsMax}
                    onChange={(e) => setContactsMax(e.target.value)}
                    placeholder="https://max.ru/aquadrive"
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: WORKFLOW & SCHEDULE */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <SlidersHorizontal size={18} className="text-accent-blue" weight="bold" />
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Расписание, боксы и буфер между записями
                  </h2>
                </div>
                <p className="text-xs text-[#86868B]">
                  Настройте рабочие часы для свободной записи клиентов, количество постов и паузу на уборку бокса.
                </p>
              </div>

              {/* 1. Working Hours (Time available for booking) */}
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-[#A1A1A6] font-mono font-semibold flex items-center gap-1.5">
                    <Clock size={14} className="text-accent-blue" />
                    Время, свободное для онлайн-записи
                  </span>
                  <span className="text-xs font-mono text-accent-blue font-bold">
                    {openingHourInput} — {closingHourInput}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-[#86868B] mb-1">
                      Время открытия (первый доступный слот)
                    </label>
                    <input
                      type="time"
                      value={openingHourInput}
                      onChange={(e) => handleSaveHours(e.target.value, closingHourInput)}
                      className="w-full bg-[#161618] border border-white/10 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#86868B] mb-1">
                      Время закрытия (последний доступный слот)
                    </label>
                    <input
                      type="time"
                      value={closingHourInput}
                      onChange={(e) => handleSaveHours(openingHourInput, e.target.value)}
                      className="w-full bg-[#161618] border border-white/10 rounded-xl px-3.5 py-2 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#86868B]">Быстрый выбор:</span>
                  {[
                    { label: '08:00 — 22:00', open: '08:00', close: '22:00' },
                    { label: '09:00 — 21:00', open: '09:00', close: '21:00' },
                    { label: '10:00 — 20:00', open: '10:00', close: '20:00' },
                    { label: 'Круглосуточно 24/7', open: '00:00', close: '23:59' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSaveHours(preset.open, preset.close)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white border border-white/5 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Buffer Minutes (Technical break between bookings) */}
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-[#A1A1A6] font-mono font-semibold">
                      Технический перерыв (буфер между машинами)
                    </span>
                    <span className="text-[11px] text-[#86868B]">
                      Пауза между окончанием мойки и заездом следующего авто для уборки бокса и продувки оборудования.
                    </span>
                  </div>
                  <span className="text-xl font-bold font-mono text-white shrink-0 ml-3">
                    {bufferMinutesInput} мин
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[0, 5, 10, 15, 20, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSaveBuffer(mins)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        bufferMinutesInput === mins
                          ? 'bg-accent-blue text-white shadow-md'
                          : 'bg-white/5 text-[#86868B] hover:text-white border border-white/5'
                      }`}
                    >
                      {mins === 0 ? 'Без буфера (0 мин)' : `+${mins} мин`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Slot step (Grid interval) */}
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-[#A1A1A6] font-mono font-semibold">
                      Шаг сетки времени записи
                    </span>
                    <span className="text-[11px] text-[#86868B]">
                      С каким интервалом клиенты видят слоты в календаре (каждые 15, 30, 45 или 60 мин).
                    </span>
                  </div>
                  <span className="text-xl font-bold font-mono text-white shrink-0 ml-3">
                    {slotStepMinutesInput} мин
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[15, 30, 45, 60].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleSaveSlotStep(step)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        slotStepMinutesInput === step
                          ? 'bg-accent-blue text-white shadow-md'
                          : 'bg-white/5 text-[#86868B] hover:text-white border border-white/5'
                      }`}
                    >
                      Каждые {step} мин
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Boxes Count */}
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-[#A1A1A6] font-mono font-semibold">
                    Количество постов (боксов мойки)
                  </span>
                  <span className="text-[11px] text-[#86868B]">
                    Сколько машин может обслуживаться параллельно в одно и то же время.
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-extrabold text-white font-mono">
                      {boxesCountInput}
                    </span>
                    <span className="text-xs text-[#86868B]">
                      {boxesCountInput === 1 ? 'бокс' : boxesCountInput < 5 ? 'бокса' : 'боксов'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={boxesCountInput <= 1}
                    onClick={() => handleSaveBoxes(boxesCountInput - 1)}
                    className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-lg font-bold text-white transition-colors"
                  >
                    -
                  </button>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSaveBoxes(num)}
                        className={`h-10 px-3.5 rounded-xl font-mono text-xs font-bold transition-all ${
                          boxesCountInput === num
                            ? 'bg-accent-blue text-white shadow-md'
                            : 'bg-white/5 text-[#86868B] hover:text-white'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={boxesCountInput >= 8}
                    onClick={() => handleSaveBoxes(boxesCountInput + 1)}
                    className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center text-lg font-bold text-white transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 5: HERO BACKGROUND PHOTO */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon size={18} className="text-accent-blue" weight="bold" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Главная фотография первого экрана (Hero)
                </h2>
              </div>
              <p className="text-xs text-[#86868B] mb-5">
                Выберите фирменный снимок автомойки или укажите прямую ссылку на фото.
              </p>

              {/* Preset Hero Thumbnails */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                {PRESET_HERO_PHOTOS.map((ph) => {
                  const isSelected = heroImageInput === ph.url;
                  return (
                    <div
                      key={ph.url}
                      onClick={() => handleApplyHeroImage(ph.url)}
                      className={`group relative overflow-hidden rounded-2xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'border-accent-blue ring-2 ring-accent-blue/50'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div
                        className="h-28 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url('${ph.url}')` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                      </div>
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white truncate drop-shadow">
                          {ph.title}
                        </span>
                        {isSelected && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue text-white shrink-0">
                            <Check size={12} weight="bold" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Image URL input */}
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-3">
                <label className="block text-xs font-semibold text-white">
                  Или своя прямая ссылка на изображение (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={heroImageInput}
                    onChange={(e) => setHeroImageInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-base-surface border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-[#6E6E73] focus:outline-none focus:border-accent-blue font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyHeroImage(heroImageInput)}
                    className="px-4 py-2 rounded-xl bg-accent-blue text-white text-xs font-bold hover:brightness-110 transition-all shrink-0 shadow-md"
                  >
                    Сохранить фото
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 6: SERVICES & PRICING BY CAR CATEGORY */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CurrencyRub size={18} className="text-accent-blue" weight="bold" />
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      Услуги и тарифы по категориям авто
                    </h2>
                  </div>
                  <p className="text-xs text-[#86868B]">
                    Задайте точные цены для Легковых, Кроссоверов и Внедорожников. Цены обновляются на лету.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddServiceOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 border border-accent-blue/30 text-xs font-semibold text-accent-blue transition-colors"
                  >
                    <Plus size={15} weight="bold" />
                    <span>Добавить услугу</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAllSettings}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-blue hover:brightness-110 text-white text-xs font-bold transition-all shadow-md"
                  >
                    <Check size={15} weight="bold" />
                    <span>Сохранить всё</span>
                  </button>
                </div>
              </div>

              {/* Modal to Add New Service */}
              {isAddServiceOpen && (
                <div className="mb-6 p-5 rounded-2xl bg-[#1C1C1E] border border-accent-blue/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkle size={16} className="text-accent-blue" weight="fill" />
                      Новая услуга в прайс-лист
                    </h3>
                    <button
                      onClick={() => setIsAddServiceOpen(false)}
                      className="text-[#86868B] hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleAddNewService} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase font-mono text-[#A1A1A6] mb-1">
                        Название услуги
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Например, Антидождь кузова и стекол"
                        value={newSvcName}
                        onChange={(e) => setNewSvcName(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono text-[#A1A1A6] mb-1">
                        Бейдж (опционально)
                      </label>
                      <input
                        type="text"
                        placeholder="Хит / Экспресс / Комплекс"
                        value={newSvcBadge}
                        onChange={(e) => setNewSvcBadge(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-blue"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] uppercase font-mono text-[#A1A1A6] mb-1">
                        Краткое описание
                      </label>
                      <input
                        type="text"
                        placeholder="Очистка, сушка турбосушкой..."
                        value={newSvcDesc}
                        onChange={(e) => setNewSvcDesc(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono text-[#A1A1A6] mb-1">
                        Длительность (минут)
                      </label>
                      <input
                        type="number"
                        min="15"
                        step="15"
                        required
                        value={newSvcDuration}
                        onChange={(e) => setNewSvcDuration(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                      />
                    </div>

                    {/* Category Prices */}
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-emerald-400 mb-1 font-semibold">
                        Легковая (₽)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        required
                        value={newSvcPriceSedan}
                        onChange={(e) => setNewSvcPriceSedan(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono text-blue-400 mb-1 font-semibold">
                        Кроссовер (₽)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        required
                        value={newSvcPriceCrossover}
                        onChange={(e) => setNewSvcPriceCrossover(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono text-amber-400 mb-1 font-semibold">
                        Внедорожник (₽)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        required
                        value={newSvcPriceSuv}
                        onChange={(e) => setNewSvcPriceSuv(e.target.value)}
                        className="w-full bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                      />
                    </div>

                    <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddServiceOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs text-[#86868B] hover:text-white"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-accent-blue text-white text-xs font-bold hover:brightness-110 shadow-md"
                      >
                        Добавить в прайс
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Service Cards with 3 Prices */}
              <div className="space-y-3">
                {siteServicesList.map((svc) => (
                  <div
                    key={svc.id}
                    className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/5 hover:border-white/10 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Title, Badge & Description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {svc.badge && (
                          <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-accent-blue/15 text-accent-blue font-bold">
                            {svc.badge}
                          </span>
                        )}
                        <input
                          type="text"
                          value={svc.name}
                          onChange={(e) => handleServiceFieldChange(svc.id, 'name', e.target.value)}
                          className="bg-transparent text-sm sm:text-base font-bold text-white focus:outline-none focus:border-b focus:border-accent-blue flex-1 min-w-[180px]"
                        />
                      </div>
                      <input
                        type="text"
                        value={svc.description}
                        onChange={(e) => handleServiceFieldChange(svc.id, 'description', e.target.value)}
                        className="w-full bg-transparent text-xs text-[#86868B] focus:text-white focus:outline-none"
                      />
                    </div>

                    {/* Duration & 3 Category Prices */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
                      <div>
                        <span className="block text-[10px] font-mono text-[#86868B] uppercase">Время</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="15"
                            step="15"
                            value={svc.durationMinutes}
                            onChange={(e) => handleServiceFieldChange(svc.id, 'durationMinutes', Number(e.target.value))}
                            className="w-14 bg-[#161618] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white text-center focus:outline-none focus:border-accent-blue"
                          />
                          <span className="text-xs text-[#86868B]">мин</span>
                        </div>
                      </div>

                      {/* Sedan Price */}
                      <div>
                        <span className="block text-[10px] font-mono text-emerald-400 uppercase font-semibold">Легковая</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={svc.prices.sedan}
                          onChange={(e) => handleServicePriceChange(svc.id, 'sedan', Number(e.target.value))}
                          className="w-20 bg-[#161618] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-accent-blue"
                        />
                      </div>

                      {/* Crossover Price */}
                      <div>
                        <span className="block text-[10px] font-mono text-blue-400 uppercase font-semibold">Кроссовер</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={svc.prices.crossover}
                          onChange={(e) => handleServicePriceChange(svc.id, 'crossover', Number(e.target.value))}
                          className="w-20 bg-[#161618] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-accent-blue"
                        />
                      </div>

                      {/* SUV Price */}
                      <div>
                        <span className="block text-[10px] font-mono text-amber-400 uppercase font-semibold">Внедорожник</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={svc.prices.suv}
                          onChange={(e) => handleServicePriceChange(svc.id, 'suv', Number(e.target.value))}
                          className="w-20 bg-[#161618] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-right focus:outline-none focus:border-accent-blue"
                        />
                      </div>

                      {/* Delete service */}
                      <button
                        type="button"
                        onClick={() => handleDeleteService(svc.id)}
                        className="p-2 rounded-xl hover:bg-rose-500/20 text-[#86868B] hover:text-rose-400 transition-colors ml-1"
                        title="Удалить услугу"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 mt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                >
                  Сбросить все настройки автомойки к стандартным
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllSettings}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-accent-blue text-white text-xs sm:text-sm font-bold hover:brightness-110 shadow-lg transition-all"
                >
                  Сохранить все изменения
                </button>
              </div>
            </div>

            {/* SECTION 7: ADMIN ACCESS & PASSWORD */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <Key size={18} className="text-accent-blue" weight="bold" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Доступ в панель (логин и пароль)
                </h2>
              </div>
              <p className="text-xs text-[#86868B] mb-5">
                Вы можете изменить логин и пароль для входа в панель управления прямо здесь.
              </p>

              <form onSubmit={handleSaveCredentials} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Логин для входа
                  </label>
                  <input
                    type="text"
                    required
                    value={adminLoginInput}
                    onChange={(e) => setAdminLoginInput(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                    Пароль для входа
                  </label>
                  <input
                    type="text"
                    required
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-[#86868B]">
                    {isCredsCustom ? (
                      <span className="text-emerald-400 font-medium">✓ Используется измененный пароль</span>
                    ) : (
                      <span>Используются стандартные логин и пароль</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isCredsCustom && (
                      <button
                        type="button"
                        onClick={handleResetCredentials}
                        className="px-3.5 py-2 rounded-xl text-xs text-[#86868B] hover:text-white"
                      >
                        Сбросить пароль
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all shadow-sm"
                    >
                      Сохранить пароль
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* SECTION 8: GOOGLE SHEETS DATABASE */}
            <div className="astryx-card p-5 sm:p-7 bg-[#161618] border border-white/10 rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Database size={18} className="text-accent-blue" weight="bold" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  База данных (Google Таблицы)
                </h2>
              </div>
              <p className="text-xs text-[#86868B]">
                Все бронирования с сайта автоматически сохраняются в вашей онлайн-таблице Google Sheets через Apps Script Web App.
              </p>

              <div>
                <label className="block text-[11px] uppercase font-mono text-[#A1A1A6] mb-1.5 font-semibold">
                  URL веб-приложения Google Apps Script (exec)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={googleSheetsUrlInput}
                    onChange={(e) => setGoogleSheetsUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-[#1C1C1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-accent-blue"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isTestingSheets}
                      onClick={handleTestSheets}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all disabled:opacity-50"
                    >
                      {isTestingSheets ? 'Проверка...' : 'Проверить связь'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGoogleSheetsUrl}
                      className="px-4 py-2.5 rounded-xl bg-accent-blue hover:brightness-110 text-xs font-bold text-white transition-all shadow-md"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              </div>

              {sheetsTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    sheetsTestResult.ok
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {sheetsTestResult.ok ? (
                    <Check size={16} weight="bold" className="shrink-0 text-emerald-400" />
                  ) : (
                    <X size={16} weight="bold" className="shrink-0 text-rose-400" />
                  )}
                  <span>{sheetsTestResult.message}</span>
                </div>
              )}

              {/* Multi-device sync actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSyncingConfig}
                  onClick={handleSyncConfigToSheets}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
                >
                  <CloudArrowUp size={16} className="text-accent-blue" weight="bold" />
                  <span>{isSyncingConfig ? 'Синхронизация...' : 'Сохранить настройки в таблицу'}</span>
                </button>
                <button
                  type="button"
                  disabled={isSyncingConfig}
                  onClick={handleLoadConfigFromSheets}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-xs font-semibold text-white transition-all disabled:opacity-50"
                >
                  <CloudArrowDown size={16} className="text-emerald-400" weight="bold" />
                  <span>Загрузить настройки из таблицы</span>
                </button>
              </div>

              {/* Ready script template accordion/modal button */}
              <div className="p-4 rounded-2xl bg-[#1C1C1E] border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code size={18} className="text-accent-blue" weight="bold" />
                    <span className="text-xs font-bold text-white">
                      Код Google Apps Script (для работы со всех устройств)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
                      setIsCopiedScript(true);
                      showToast('Код скрипта скопирован в буфер!');
                      setTimeout(() => setIsCopiedScript(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-blue hover:brightness-110 text-xs font-bold text-white transition-all"
                  >
                    {isCopiedScript ? <Check size={14} weight="bold" /> : <Copy size={14} />}
                    <span>{isCopiedScript ? 'Скопировано!' : 'Скопировать готовый код'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#86868B] leading-relaxed">
                  Чтобы база данных отображалась в админке с разных устройств (телефон, планшет, ПК), вставьте этот код в Apps Script вашей таблицы (Расширения → Apps Script) и нажмите «Новое развертывание» (Веб-приложение, доступ: Все).
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#86868B] border-t border-white/[0.06]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34C759]" />
                  <span>
                    Загружено из Google Таблицы: <strong className="text-white">{remoteBookings.length}</strong> записей
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => window.open(googleSheetsUrlInput, '_blank')}
                  className="inline-flex items-center gap-1 text-accent-blue hover:underline font-mono"
                >
                  <span>Проверить эндпоинт</span>
                  <ArrowSquareOut size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Add Booking Modal for Timeline */}
        {isAddModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setIsAddModalOpen(false); }}
          >
            <div className="astryx-card w-full max-w-md bg-[#161618] border border-white/10 p-5 sm:p-6 rounded-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">
                  Ручное добавление записи
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[#86868B] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateBooking} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                    Имя клиента
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Артём"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+7 (999) 000-00-00"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                    Автомобиль (марка, госномер)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BMW X5 М 123 ММ 77"
                    value={newCarModel}
                    onChange={(e) => setNewCarModel(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                      Бокс
                    </label>
                    <select
                      value={newBox}
                      onChange={(e) => setNewBox(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                    >
                      {Array.from({ length: config.boxesCount || 3 }).map((_, i) => (
                        <option key={i} value={`Бокс ${i + 1}`}>
                          Бокс {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                      Время заезда
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-text-secondary uppercase mb-1">
                    Услуга
                  </label>
                  <select
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    {config.services.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title} ({s.price} ₽)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-white/10 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Отмена
                  </button>
                  <GlassButton type="submit" variant="primary" size="sm" className="flex-1">
                    Создать запись
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
