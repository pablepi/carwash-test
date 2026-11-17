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
  Building,
} from '@phosphor-icons/react';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { slugify } from '@/lib/slugify';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();
  const { config } = useSiteConfig();
  const [copied, setCopied] = useState(false);

  // Dynamic user / tenant configuration
  const brandName = config.branding.name || 'AquaDrive';
  const currentSlug = tenantSlug || slugify(brandName);
  const city = config.contacts.city || 'Москва';
  const address = config.contacts.address || 'г. Москва, ул. Автозаводская, д. 23, корп. 7';
  const phone = config.contacts.phone || '+7 (999) 000-00-00';
  const email = config.contacts.email || `info@${slugify(brandName)}.ru`;
  const legalEntity = config.contacts.legalEntity || `ИП Смирнов А. В. / Студия автомойки «${brandName}»`;
  const inn = config.contacts.inn || '';
  const hours = config.contacts.workingHours || `Ежедневно: ${config.workflow.openingHour || '08:00'} — ${config.workflow.closingHour || '22:00'}`;
  const boxesCount = config.workflow.boxesCount || 2;

  // Dynamic services & car categories lists
  const servicesListStr = config.services && config.services.length > 0
    ? config.services.map((s) => s.name).join(', ')
    : 'Экспресс-мойка, Комплекс (кузов + салон), Премиум детейлинг';

  const carCategoriesListStr = config.carCategories && config.carCategories.length > 0
    ? config.carCategories.map((c) => c.name).join(', ')
    : 'Легковая, Кроссовер, Внедорожник';

  const websiteDomain = typeof window !== 'undefined' ? window.location.origin : 'https://aquadrive.ru';
  const websiteHost = typeof window !== 'undefined' ? window.location.host : 'aquadrive.ru';

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
    <div className="min-h-screen bg-base-darkest text-text-primary py-6 sm:py-12 px-3 sm:px-6 flex flex-col justify-between transition-colors duration-300 selection:bg-accent-blue selection:text-white">
      {/* Top action bar adhering to active theme */}
      <div className="mx-auto w-full max-w-4xl mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/s/${currentSlug}`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/[0.05] dark:bg-white/10 hover:bg-black/[0.10] dark:hover:bg-white/20 text-[#1C1C1E] dark:text-white border border-black/10 dark:border-white/10 text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Вернуться на главную</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-black/[0.05] dark:bg-white/10 hover:bg-black/[0.10] dark:hover:bg-white/20 text-[#1C1C1E] dark:text-white border border-black/10 dark:border-white/10 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title="Распечатать или сохранить в PDF"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Печать / PDF</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-black/[0.05] dark:bg-white/10 hover:bg-black/[0.10] dark:hover:bg-white/20 text-[#1C1C1E] dark:text-white border border-black/10 dark:border-white/10 text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            {copied ? <CheckCircle size={16} className="text-emerald-500" weight="fill" /> : <ShareNetwork size={16} />}
            <span>{copied ? 'Скопировано!' : 'Поделиться'}</span>
          </button>
        </div>
      </div>

      {/* Main Document Container - Fully styled under the site's theme */}
      <main className="astryx-card mx-auto w-full max-w-4xl bg-white dark:bg-[#161618] text-[#1C1C1E] dark:text-[#F5F5F7] rounded-3xl p-6 sm:p-12 shadow-2xl border border-black/10 dark:border-white/10 leading-relaxed font-sans transition-colors duration-300">
        {/* Document Header */}
        <header className="border-b border-black/10 dark:border-white/10 pb-6 mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <ShieldCheck size={14} weight="fill" />
              152-ФЗ «О персональных данных»
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/10 text-[#636366] dark:text-[#A1A1A6] text-xs font-medium">
              <Clock size={13} />
              Действующая редакция: {new Date().getFullYear()} год
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1C1C1E] dark:text-white tracking-tight mb-2">
            Политика в отношении обработки персональных данных
          </h1>
          <p className="text-sm sm:text-base text-[#636366] dark:text-[#A1A1A6]">
            Оператор: <strong>{legalEntity}</strong> • Бренд: <strong>{brandName}</strong> • Адрес: {address} ({city})
          </p>
        </header>

        {/* Quick Anchor Navigation */}
        <nav aria-label="Оглавление" className="mb-8 p-4 bg-black/[0.03] dark:bg-[#1C1C1E] rounded-2xl border border-black/5 dark:border-white/10 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-[#1C1C1E] dark:text-white mb-2.5">
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
              { id: 'sec-8', label: '8. Контакты Оператора' },
            ].map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#242426] border border-black/10 dark:border-white/10 text-[#1C1C1E] dark:text-[#F5F5F7] hover:text-accent-blue dark:hover:text-accent-blue hover:border-accent-blue/50 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Document Content Sections (Tilda Privacy Standard / 152-ФЗ compliant) */}
        <article className="space-y-8 text-sm sm:text-base text-[#3A3A3C] dark:text-[#D1D1D6]">
          {/* Section 1 */}
          <section id="sec-1" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              1. Общие положения
            </h2>
            <div className="space-y-2.5">
              <p>
                1.1. Настоящая Политика обработки персональных данных (далее — «Политика») составлена в соответствии с
                требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки
                персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые{' '}
                <strong className="text-[#1C1C1E] dark:text-white">{legalEntity}</strong>
                {inn ? ` (ИНН: ${inn})` : ''} (коммерческое обозначение студии: <strong className="text-[#1C1C1E] dark:text-white">{brandName}</strong>, далее — «Оператор»).
              </p>
              <p>
                1.2. Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод
                человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной
                жизни, личную и семейную тайну.
              </p>
              <p>
                1.3. Настоящая Политика действует в отношении всей информации, которую Оператор может получить о посетителях и клиентах
                веб-сайта и сервиса онлайн-записи <strong className="text-[#1C1C1E] dark:text-white">{websiteDomain}</strong> (включая домен {websiteHost}).
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="sec-2" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              2. Основные понятия, используемые в Политике
            </h2>
            <ul className="list-disc list-inside space-y-2 pl-1">
              <li>
                <strong className="text-[#1C1C1E] dark:text-white">Персональные данные</strong> — любая информация, относящаяся прямо или косвенно к определенному или
                определяемому Пользователю веб-сервиса {websiteHost}.
              </li>
              <li>
                <strong className="text-[#1C1C1E] dark:text-white">Оператор</strong> — {legalEntity}, студия автомойки и детейлинга «{brandName}», расположенная по адресу: {address} ({city}), самостоятельно организующая и осуществляющая обработку персональных данных.
              </li>
              <li>
                <strong className="text-[#1C1C1E] dark:text-white">Обработка персональных данных</strong> — любое действие (операция) или совокупность действий, совершаемых
                с использованием средств автоматизации или без них с персональными данными (сбор, запись, систематизация,
                накопление, хранение, уточнение, использование, удаление).
              </li>
              <li>
                <strong className="text-[#1C1C1E] dark:text-white">Пользователь</strong> — любой посетитель веб-сайта {websiteHost}, оформляющий предварительную запись на услуги студии ({servicesListStr}) или проверяющий статус готовности автомобиля.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="sec-3" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              3. Основные права и обязанности
            </h2>
            <div className="space-y-2.5">
              <p>
                <strong className="text-[#1C1C1E] dark:text-white">3.1. Оператор имеет право:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Получать от Пользователя достоверные данные, необходимые для бронирования слота и выполнения выбранных услуг;</li>
                <li>Использовать переданный номер телефона для отправки SMS, звонков или мессенджер-уведомлений о статусе брони;</li>
                <li>В случае отзыва согласия Пользователем продолжить обработку данных при наличии оснований, предусмотренных законодательством РФ.</li>
              </ul>
              <p className="pt-2">
                <strong className="text-[#1C1C1E] dark:text-white">3.2. Пользователь имеет право:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Получать полную информацию, касающуюся обработки его персональных данных;</li>
                <li>Требовать уточнения, блокирования или уничтожения неполных, неточных или неактуальных сведений;</li>
                <li>Отозвать согласие на обработку персональных данных в любое удобное время.</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section id="sec-4" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              4. Цели обработки персональных данных
            </h2>
            <div className="space-y-2.5">
              <p>Персональные данные Пользователя обрабатываются Оператором исключительно в следующих целях:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>
                  <strong className="text-[#1C1C1E] dark:text-white">Оформление онлайн-бронирования:</strong> выбор даты, времени заезда и закрепленного бокса в студии «{brandName}» (всего оборудовано рабочих боксов: {boxesCount});
                </li>
                <li>
                  <strong className="text-[#1C1C1E] dark:text-white">Точный расчет стоимости:</strong> определение цены услуги ({servicesListStr}) в зависимости от выбранной категории автомобиля ({carCategoriesListStr});
                </li>
                <li>
                  <strong className="text-[#1C1C1E] dark:text-white">Уведомление и координация:</strong> подтверждение записи, информирование о времени работы студии ({hours}) и готовности авто к выдаче через онлайн-раздел «Моя запись»;
                </li>
                <li>
                  <strong className="text-[#1C1C1E] dark:text-white">Клиентская поддержка:</strong> оперативная связь администратора студии по телефону <strong className="text-[#1C1C1E] dark:text-white">{phone}</strong> при необходимости переноса визита или консультации по детейлингу.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section id="sec-5" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              5. Категории обрабатываемых данных
            </h2>
            <div className="space-y-3">
              <p>Оператор обрабатывает следующие категории данных, предоставляемые Пользователем добровольно при записи:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10">
                  <span className="block font-bold text-[#1C1C1E] dark:text-white text-sm mb-1">Имя клиента</span>
                  <span className="text-xs text-[#636366] dark:text-[#A1A1A6]">Для персонализированного обращения к клиенту и идентификации в расписании боксов.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10">
                  <span className="block font-bold text-[#1C1C1E] dark:text-white text-sm mb-1">Номер телефона</span>
                  <span className="text-xs text-[#636366] dark:text-[#A1A1A6]">Для связи администратора ({phone}), подтверждения слота и поиска брони без авторизации.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10">
                  <span className="block font-bold text-[#1C1C1E] dark:text-white text-sm mb-1">Марка, модель и госномер авто</span>
                  <span className="text-xs text-[#636366] dark:text-[#A1A1A6]">Для проезда в боксы по адресу ({address}), подбора автохимии и проверки статуса в системе.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-black/[0.03] dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10">
                  <span className="block font-bold text-[#1C1C1E] dark:text-white text-sm mb-1">Категория кузова</span>
                  <span className="text-xs text-[#636366] dark:text-[#A1A1A6]">Категории: {carCategoriesListStr} — для правильного расчёта времени мойки и стоимости.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="sec-6" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              6. Порядок сбора, хранения и безопасность данных
            </h2>
            <div className="space-y-2.5">
              <p>
                6.1. Безопасность персональных данных обеспечивается путем реализации правовых,
                организационных и технических мер, необходимых для выполнения в полном объеме требований законодательства РФ в области защиты информации.
              </p>
              <p>
                6.2. Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие несанкционированный доступ к
                персональным данным третьих лиц.
              </p>
              <p>
                6.3. Персональные данные Пользователя <strong className="text-[#1C1C1E] dark:text-white">ни при каких условиях не передаются третьим лицам</strong>, за
                исключением случаев, непосредственно предусмотренных действующим законодательством РФ.
              </p>
              <p>
                6.4. Срок обработки данных определяется достижением целей оказания услуг мойки и детейлинга в студии «{brandName}».
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="sec-7" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              7. Актуализация, исправление и отзыв согласия
            </h2>
            <div className="space-y-2.5">
              <p>
                7.1. Пользователь может в любой момент отозвать свое согласие на обработку персональных данных,
                направив уведомление Оператору по телефону <strong className="text-[#1C1C1E] dark:text-white">{phone}</strong> или на
                электронную почту <strong className="text-[#1C1C1E] dark:text-white">{email}</strong> с темой «Отзыв согласия на обработку персональных данных».
              </p>
              <p>
                7.2. В случае получения отзыва согласия Оператор обязуется прекратить обработку и уничтожить персональные данные в срок, не
                превышающий 30 календарных дней.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="sec-8" className="scroll-mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#1C1C1E] dark:text-white mb-3 border-l-4 border-accent-blue pl-3">
              8. Контактная информация Оператора
            </h2>
            <div className="p-4 sm:p-5 rounded-2xl bg-black/[0.03] dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 text-sm space-y-2.5">
              <p className="font-bold text-[#1C1C1E] dark:text-white text-base flex items-center gap-2">
                <Building size={18} className="text-accent-blue" weight="bold" />
                <span>{legalEntity}</span>
              </p>
              <p className="text-xs text-[#636366] dark:text-[#A1A1A6]">
                Коммерческое обозначение студии: <strong className="text-[#1C1C1E] dark:text-white">{brandName}</strong>
              </p>
              <div className="flex items-start gap-2.5 text-[#3A3A3C] dark:text-[#D1D1D6]">
                <MapPin size={18} className="text-accent-blue shrink-0 mt-0.5" weight="fill" />
                <span>{address} ({city})</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#3A3A3C] dark:text-[#D1D1D6]">
                <Clock size={18} className="text-accent-blue shrink-0" weight="fill" />
                <span>Режим работы: {hours} (боксов: {boxesCount})</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#3A3A3C] dark:text-[#D1D1D6]">
                <Phone size={18} className="text-accent-blue shrink-0" weight="fill" />
                <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="font-semibold text-[#1C1C1E] dark:text-white hover:text-accent-blue transition-colors">
                  {phone}
                </a>
              </div>
              <div className="flex items-center gap-2.5 text-[#3A3A3C] dark:text-[#D1D1D6]">
                <Envelope size={18} className="text-accent-blue shrink-0" weight="fill" />
                <a href={`mailto:${email}`} className="font-semibold text-[#1C1C1E] dark:text-white hover:text-accent-blue transition-colors">
                  {email}
                </a>
              </div>
              {inn && (
                <div className="text-xs text-[#636366] dark:text-[#A1A1A6] pt-1 border-t border-black/5 dark:border-white/10">
                  ИНН оператора: <span className="font-mono">{inn}</span>
                </div>
              )}
            </div>
          </section>
        </article>

        {/* Document Footer Call to action */}
        <div className="mt-10 pt-6 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#636366] dark:text-[#8E8E93] text-center sm:text-left">
            Используя сайт {websiteHost}, вы подтверждаете ознакомление с настоящей Политикой конфиденциальности.
          </p>

          <button
            onClick={() => navigate(`/s/${currentSlug}`)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-accent-blue hover:bg-accent-blue-hover text-white font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
          >
            <CalendarPlus size={18} weight="bold" />
            <span>Записаться на мойку</span>
          </button>
        </div>
      </main>

      {/* Footer matching theme */}
      <footer className="mx-auto w-full max-w-4xl pt-6 text-center text-xs text-[#636366] dark:text-white/50">
        <p>© {new Date().getFullYear()} {brandName} ({legalEntity}). Документ соответствует требованиям 152-ФЗ РФ.</p>
      </footer>
    </div>
  );
};
