import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  ShareNetwork,
  ShieldCheck,
  CheckCircle,
  CalendarPlus,
  FileText,
  MapPin,
  Phone,
  Envelope,
  Clock,
} from '@phosphor-icons/react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { slugify } from '@/lib/slugify';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const { config } = useSiteConfig();
  const [copied, setCopied] = useState(false);

  const name = config.branding.name || 'AquaDrive';
  const currentSlug = tenantSlug || slugify(name);
  const city = config.contacts.city || 'Москва';
  const address = config.contacts.address || 'г. Москва, ул. Автозаводская, д. 23, корп. 7';
  const phone = config.contacts.phone || '+7 (999) 000-00-00';
  const email = (config.contacts as any).email || `privacy@${slugify(name)}.ru`;
  const websiteDomain = typeof window !== 'undefined' ? window.location.origin : 'https://aquadrive.ru';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white py-6 sm:py-12 px-3 sm:px-6 flex flex-col justify-between selection:bg-[#00C7BE] selection:text-black">
      {/* Top action bar on black background */}
      <div className="mx-auto w-full max-w-4xl mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/s/${currentSlug}`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-all active:scale-95"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Вернуться на главную</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all active:scale-95"
            title="Распечатать или сохранить в PDF"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Печать / PDF</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all active:scale-95"
          >
            {copied ? <CheckCircle size={16} className="text-emerald-400" weight="fill" /> : <ShareNetwork size={16} />}
            <span>{copied ? 'Скопировано!' : 'Поделиться'}</span>
          </button>
        </div>
      </div>

      {/* Main White Document Container on Black Background */}
      <main className="mx-auto w-full max-w-4xl bg-[#FFFFFF] text-[#1D1D1F] rounded-3xl p-6 sm:p-12 shadow-2xl border border-white/20 leading-relaxed font-sans">
        {/* Document Header */}
        <header className="border-b border-gray-200 pb-6 mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck size={14} weight="fill" />
              152-ФЗ «О персональных данных»
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
              <Clock size={13} />
              Действующая редакция: 2026 год
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111827] tracking-tight mb-2">
            Политика в отношении обработки персональных данных
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Оператор: <strong>{name}</strong> • Адрес студии: {address}
          </p>
        </header>

        {/* Quick Anchor Navigation */}
        <nav aria-label="Оглавление" className="mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-gray-800 mb-2.5">
            <FileText size={16} className="text-accent-blue" weight="bold" />
            <span>Разделы документа:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { id: 'sec-1', label: '1. Общие положения' },
              { id: 'sec-2', label: '2. Основные понятия' },
              { id: 'sec-3', label: '3. Права и обязанности' },
              { id: 'sec-4', label: '4. Цели обработки' },
              { id: 'sec-5', label: '5. Собираемые данные' },
              { id: 'sec-6', label: '6. Хранение и безопасность' },
              { id: 'sec-7', label: '7. Отзыв согласия' },
              { id: 'sec-8', label: '8. Контакты' },
            ].map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:text-accent-blue hover:border-accent-blue/40 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Document Content Sections (Tilda Privacy Standard / 152-ФЗ compliant) */}
        <article className="space-y-8 text-sm sm:text-base text-gray-800">
          {/* Section 1 */}
          <section id="sec-1" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              1. Общие положения
            </h2>
            <div className="space-y-2.5 text-gray-700">
              <p>
                1.1. Настоящая Политика обработки персональных данных (далее — «Политика») составлена в соответствии с
                требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки
                персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые{' '}
                <strong>{name}</strong> (далее — «Оператор»).
              </p>
              <p>
                1.2. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод
                человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной
                жизни, личную и семейную тайну.
              </p>
              <p>
                1.3. Настоящая Политика действует в отношении всей информации, которую Оператор может получить о пользователях
                веб-сайта и сервиса онлайн-записи <strong>{websiteDomain}</strong>.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="sec-2" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              2. Основные понятия, используемые в Политике
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 pl-1">
              <li>
                <strong>Персональные данные</strong> — любая информация, относящаяся прямо или косвенно к определенному или
                определяемому Пользователю веб-сайта {websiteDomain}.
              </li>
              <li>
                <strong>Оператор</strong> — студия автомойки и детейлинга «{name}», самостоятельно организующая и осуществляющая
                обработку персональных данных, а также определяющая цели обработки.
              </li>
              <li>
                <strong>Обработка персональных данных</strong> — любое действие (операция) или совокупность действий, совершаемых
                с использованием средств автоматизации или без них с персональными данными (сбор, запись, систематизация,
                накопление, хранение, уточнение, извлечение, использование, удаление).
              </li>
              <li>
                <strong>Пользователь</strong> — любой посетитель веб-сайта {websiteDomain}, оформляющий запись на услуги студии
                или проверяющий статус своего автомобиля.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="sec-3" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              3. Основные права и обязанности
            </h2>
            <div className="space-y-2.5 text-gray-700">
              <p>
                <strong>3.1. Оператор имеет право:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Получать от Пользователя достоверные данные, необходимые для бронирования слота и предоставления услуг;</li>
                <li>Использовать переданные контакты для отправки SMS- или мессенджер-уведомлений о статусе бронирования;</li>
                <li>В случае отзыва согласия Пользователем продолжить обработку данных при наличии законных оснований 152-ФЗ.</li>
              </ul>
              <p className="pt-2">
                <strong>3.2. Пользователь имеет право:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Получать информацию, касающуюся обработки его персональных данных;</li>
                <li>Требовать уточнения, блокирования или уничтожения неполных, устаревших или неточных данных;</li>
                <li>Отозвать согласие на обработку персональных данных в любое время.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section id="sec-4" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              4. Цели обработки персональных данных
            </h2>
            <div className="space-y-2.5 text-gray-700">
              <p>Персональные данные Пользователя обрабатываются Оператором исключительно в следующих целях:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>
                  <strong>Оформление предварительной онлайн-записи:</strong> выбор даты, временного слота и закрепленного бокса в
                  студии {name};
                </li>
                <li>
                  <strong>Точный расчет стоимости:</strong> определение тарифа в зависимости от выбранной категории автомобиля
                  (седан, кроссовер или внедорожник);
                </li>
                <li>
                  <strong>Уведомление и координация:</strong> информирование клиента о подтверждении записи, назначении бокса и
                  готовности автомобиля к выдаче через раздел «Моя запись»;
                </li>
                <li>
                  <strong>Клиентская поддержка:</strong> оперативная обратная связь по телефону или через мессенджеры в случае
                  изменения расписания или дополнительных пожеланий клиента.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section id="sec-5" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              5. Категории обрабатываемых данных
            </h2>
            <div className="space-y-3 text-gray-700">
              <p>Оператор обрабатывает следующие категории данных, предоставляемые Пользователем добровольно:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="block font-bold text-gray-900 text-sm mb-1">Имя клиента</span>
                  <span className="text-xs text-gray-600">Для обращения к клиенту и идентификации в расписании боксов.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="block font-bold text-gray-900 text-sm mb-1">Номер телефона</span>
                  <span className="text-xs text-gray-600">Для подтверждения записи, связи администратора и поиска брони.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="block font-bold text-gray-900 text-sm mb-1">Марка и госномер авто</span>
                  <span className="text-xs text-gray-600">Для проезда в бокс, подготовки химии и отслеживания статуса авто.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="block font-bold text-gray-900 text-sm mb-1">Технические файлы Cookies</span>
                  <span className="text-xs text-gray-600">Для сохранения выбранных параметров и быстрого восстановления брони.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="sec-6" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              6. Порядок сбора, хранения и безопасность данных
            </h2>
            <div className="space-y-2.5 text-gray-700">
              <p>
                6.1. Безопасность персональных данных, обрабатываемых Оператором, обеспечивается путем реализации правовых,
                организационных и технических мер, необходимых для выполнения в полном объеме требований действующего
                законодательства в области защиты персональных данных.
              </p>
              <p>
                6.2. Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие доступ к
                персональным данным неуполномоченных лиц.
              </p>
              <p>
                6.3. Персональные данные Пользователя <strong>ни при каких условиях не передаются третьим лицам</strong>, за
                исключением случаев, непосредственно связанных с исполнением действующего законодательства РФ.
              </p>
              <p>
                6.4. Срок обработки персональных данных определяется достижением целей, для которых они были собраны (оказание услуг
                мойки и детейлинга).
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="sec-7" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              7. Актуализация, исправление и отзыв согласия
            </h2>
            <div className="space-y-2.5 text-gray-700">
              <p>
                7.1. Пользователь может в любой момент актуализировать свои персональные данные, а также отозвать свое согласие на
                их обработку, направив соответствующее уведомление Оператору по телефону <strong>{phone}</strong> или на
                электронную почту <strong>{email}</strong> с пометкой «Отзыв согласия на обработку персональных данных».
              </p>
              <p>
                7.2. В случае отзыва согласия Оператор обязуется прекратить обработку и уничтожить персональные данные в срок, не
                превышающий 30 календарных дней с момента получения уведомления.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="sec-8" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 border-l-4 border-accent-blue pl-3">
              8. Контактная информация Оператора
            </h2>
            <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200 text-sm space-y-2.5">
              <p className="font-bold text-gray-900 text-base">{name} — Студия автомойки и детейлинга</p>
              <div className="flex items-start gap-2.5 text-gray-700">
                <MapPin size={18} className="text-accent-blue shrink-0 mt-0.5" weight="fill" />
                <span>{address} ({city})</span>
              </div>
              <div className="flex items-center gap-2.5 text-gray-700">
                <Phone size={18} className="text-accent-blue shrink-0" weight="fill" />
                <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="font-semibold text-gray-900 hover:text-accent-blue">
                  {phone}
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-gray-700">
                <Envelope size={18} className="text-accent-blue shrink-0" weight="fill" />
                <span>{email}</span>
              </div>
            </div>
          </section>
        </article>

        {/* Document Footer Call to action */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            Используя сайт {websiteDomain}, вы подтверждаете ознакомление с настоящей Политикой конфиденциальности.
          </p>

          <button
            onClick={() => navigate(`/s/${currentSlug}`)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#00C7BE] hover:bg-[#00B3AB] text-black font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
          >
            <CalendarPlus size={18} weight="bold" />
            <span>Записаться на мойку</span>
          </button>
        </div>
      </main>

      {/* Footer on black background */}
      <footer className="mx-auto w-full max-w-4xl pt-6 text-center text-xs text-white/50">
        <p>© {new Date().getFullYear()} {name}. Документ соответствует требованиям 152-ФЗ РФ.</p>
      </footer>
    </div>
  );
};
