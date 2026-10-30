export const DEFAULT_GOOGLE_SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbxKubYJw5gT9DDk90lBmr0VpPYxQT3Mc9o-xwH44zzqK0i9ubZNiqioydUWEK_LSjLSZA/exec';

export interface GoogleSheetsBookingPayload {
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  clientName: string;
  clientPhone: string;
  carModel?: string;
  serviceTitle?: string;
  totalPrice?: number;
  booking_number?: string;
  cancellation_token?: string;
  boxName?: string;
  status?: string;
  action?: string;
}

export interface RemoteBookingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  clientName: string;
  clientPhone: string;
  carModel: string;
  serviceTitle: string;
  totalPrice: number;
  booking_number: string;
  boxName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'done' | 'cancelled';
  createdAt?: string;
}

/**
 * Sends a booking record to the user's Google Sheets Apps Script Web App.
 * Uses text/plain to avoid browser CORS preflight blocks with Google Apps Script.
 * Always formats phone with an apostrophe if it starts with '+' to prevent #ERROR! formula parse error.
 */
export async function sendBookingToGoogleSheets(
  booking: GoogleSheetsBookingPayload,
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<{ success: boolean; message?: string }> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  const rawPhone = (booking.clientPhone || '').trim();
  // Always prefix with apostrophe if not already present so Google Sheets never parses it as a formula (#ERROR!)
  const safePhone = rawPhone ? (rawPhone.startsWith("'") ? rawPhone : `'${rawPhone}`) : '';

  const payload = {
    action: 'createBooking',
    date: booking.date,
    timeSlot: booking.timeSlot,
    clientName: booking.clientName,
    clientPhone: safePhone,
    carModel: booking.carModel || '',
    serviceTitle: booking.serviceTitle || '',
    totalPrice: booking.totalPrice || 0,
    booking_number: booking.booking_number || booking.cancellation_token || '',
    cancellation_token: booking.cancellation_token || booking.booking_number || '',
    boxName: booking.boxName || 'Бокс 1',
    status: booking.status || 'pending',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      try {
        const json = await res.json();
        return { success: json.status === 'success', message: json.message };
      } catch {
        return { success: true };
      }
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Google Sheets API direct post warning, attempting fallback:', err);
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      return { success: true };
    } catch (fallbackErr: any) {
      console.error('Failed to send booking to Google Sheets:', fallbackErr);
      return { success: false, message: fallbackErr.message };
    }
  }
}

export interface FetchBookingsResult {
  success: boolean;
  bookings: RemoteBookingRecord[];
  error?: string;
  isOldDeployment?: boolean;
}

function normalizeDate(raw: any): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const clean = s.replace(/\s*\(.*\)/, '');
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      // In Google Sheets created with America/New_York timezone, format correctly in Europe/Moscow
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(d);
    }
  } catch {}
  return s;
}

function normalizeTime(raw: any): string {
  if (!raw) return '12:00';
  const s = String(raw).trim();
  const simpleMatch = s.match(/^(\d{1,2}):(\d{2})$/);
  if (simpleMatch) {
    return simpleMatch[1].padStart(2, '0') + ':' + simpleMatch[2];
  }
  // Full Date string from Google Sheets (e.g. Sat Dec 30 1899 13:59:43 GMT-0500)
  if (s.includes('GMT') || s.includes('1899') || s.includes('T')) {
    try {
      const clean = s.replace(/\s*\(.*\)/, '');
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        // Use Intl.DateTimeFormat with Europe/Moscow timezone so historical 1899 LMT offsets are handled accurately
        return new Intl.DateTimeFormat('ru-RU', {
          timeZone: 'Europe/Moscow',
          hour: '2-digit',
          minute: '2-digit',
        }).format(d);
      }
    } catch {}
  }
  const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return timeMatch[1].padStart(2, '0') + ':' + timeMatch[2];
  }
  return '12:00';
}

/**
 * Fetches all bookings with rich status info (diagnosing old deployments, errors).
 */
export async function fetchBookingsWithStatus(
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<FetchBookingsResult> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  try {
    const res = await fetch(`${url}?action=getAllBookings`, {
      method: 'GET',
    });
    if (!res.ok) {
      return { success: false, bookings: [], error: `Ошибка HTTP: ${res.status}` };
    }
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.bookings)) {
      const parsed: RemoteBookingRecord[] = data.bookings.map((b: any, idx: number) => {
        let cleanPhone = String(b.clientPhone || '').trim();
        if (cleanPhone.startsWith("'")) cleanPhone = cleanPhone.slice(1);
        if (cleanPhone.includes('#ERROR!')) cleanPhone = '';

        let rawToken = String(b.booking_number || b.token || b.cancellation_token || '').trim();
        if (rawToken.toLowerCase().includes('бокс')) {
          rawToken = '';
        }
        const finalBookingNumber = rawToken || `AD-${1000 + idx}`;

        return {
          id: b.id || `gs-${idx}`,
          date: normalizeDate(b.date),
          timeSlot: normalizeTime(b.timeSlot),
          clientName: b.clientName || 'Клиент с сайта',
          clientPhone: cleanPhone || '+7 (999) 000-00-00',
          carModel: b.carModel || 'Автомобиль',
          serviceTitle: b.serviceTitle || 'Услуга',
          totalPrice: Number(b.totalPrice) || 0,
          booking_number: finalBookingNumber,
          boxName: b.boxName || 'Бокс 1',
          status: (b.status === 'cancelled'
            ? 'cancelled'
            : b.status === 'completed'
            ? 'completed'
            : b.status === 'in_progress'
            ? 'in_progress'
            : 'pending') as any,
          createdAt: b.createdAt || '',
        };
      });
      return { success: true, bookings: parsed };
    }

    if (data.status === 'error') {
      const msg = String(data.message || '');
      const isOld = msg.includes('date') || msg.includes('обязателен');
      return {
        success: false,
        bookings: [],
        error: msg || 'Ошибка ответа от Google Apps Script',
        isOldDeployment: isOld,
      };
    }

    return { success: false, bookings: [], error: 'Неизвестный формат ответа' };
  } catch (err: any) {
    return { success: false, bookings: [], error: err.message || 'Сетевая ошибка' };
  }
}

/**
 * Fetches all bookings from Google Sheets for the admin dashboard (Timeline and History).
 * Works across any device (phone, laptop, tablet).
 */
export async function fetchAllBookingsFromGoogleSheets(
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<RemoteBookingRecord[]> {
  const res = await fetchBookingsWithStatus(scriptUrl);
  return res.bookings;
}

/**
 * Fetches busy slots for a given date from Google Sheets.
 */
export async function fetchBusySlotsFromGoogleSheets(
  dateStr: string,
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<string[]> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  try {
    const res = await fetch(`${url}?date=${encodeURIComponent(dateStr)}`, {
      method: 'GET',
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === 'success' && Array.isArray(data.busySlots)) {
      return data.busySlots.map((s: any) => normalizeTime(typeof s === 'string' ? s : s?.timeSlot || String(s)));
    }
    return [];
  } catch (err) {
    console.warn('Could not fetch busy slots from Google Sheets:', err);
    return [];
  }
}

/**
 * Saves site configuration JSON into Google Sheets so settings sync across all devices.
 */
export async function saveConfigToGoogleSheets(
  config: any,
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<{ success: boolean; message?: string }> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'saveConfig',
        config,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: data.status === 'success', message: data.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Fetches site configuration JSON from Google Sheets.
 */
export async function fetchConfigFromGoogleSheets(
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<any | null> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  try {
    const res = await fetch(`${url}?action=getConfig`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'success' && data.config) {
      return data.config;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Tests connection to Google Sheets Web App.
 */
export async function testGoogleSheetsConnection(
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<{ ok: boolean; message: string }> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${url}?date=${encodeURIComponent(todayStr)}`, {
      method: 'GET',
    });
    const data = await res.json();
    if (data.status === 'success') {
      return { ok: true, message: 'Связь с Google Таблицей успешно установлена!' };
    }
    return { ok: false, message: data.message || 'Ошибка ответа от Google Таблицы' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Не удалось связаться с Google Таблицей' };
  }
}

/**
 * Up-to-date Google Apps Script code template that supports:
 *  - Auto-detection of columns by header names (handles any order!)
 *  - Safe phone number storage with text apostrophe (completely fixes #ERROR!)
 *  - Real-time booking saving
 *  - GET all bookings for Admin on any device
 *  - Config and admin password sync across devices
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * УНИВЕРСАЛЬНЫЙ СКРИПТ ДЛЯ GOOGLE ТАБЛИЦЫ АВТОМОЙКИ (v2.0)
 * 
 * Особенности:
 * 1. Автоматически находит нужные колонки по заголовкам (независимо от порядка!).
 * 2. Номер телефона записывается как чистый текст (предотвращает #ERROR!).
 * 3. Отдает все бронирования в админку на любом устройстве.
 * 4. Синхронизирует настройки и пароль администратора.
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var dateParam = (e && e.parameter && e.parameter.date) || '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Получение настроек сайта
  if (action === 'getConfig') {
    var configSheet = ss.getSheetByName('Настройки');
    if (!configSheet) {
      return jsonResponse({ status: 'not_found', config: null });
    }
    var configVal = configSheet.getRange(1, 1).getValue();
    try {
      return jsonResponse({ status: 'success', config: JSON.parse(configVal) });
    } catch (err) {
      return jsonResponse({ status: 'error', message: 'Config parsing error' });
    }
  }

  // 2. Получение всех записей для админки (для любых устройств)
  var sheet = getBookingsSheet(ss);
  var data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) {
    return jsonResponse({ status: 'success', bookings: [], busySlots: [] });
  }

  var colMap = getColumnMap(data[0]);

  if (action === 'getAllBookings' || action === 'all' || !dateParam) {
    var bookings = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rDate = cleanStr(row[colMap.date]);
      var rTime = cleanStr(row[colMap.time]);
      var rClient = cleanStr(row[colMap.client]);
      var rPhone = cleanStr(row[colMap.phone]);

      if (!rDate && !rTime && !rClient && !rPhone) continue;

      var rToken = (colMap.token !== -1 && colMap.token < row.length) ? cleanStr(row[colMap.token]) : '';
      if (rToken.indexOf('Бокс') !== -1 || rToken.indexOf('бокс') !== -1) rToken = '';
      var bookingNum = rToken || ('AD-' + (1000 + i));

      var rService = (colMap.service !== -1 && colMap.service < row.length) ? cleanStr(row[colMap.service]) : '';
      if (/^\d+$/.test(rService.trim())) rService = '';

      bookings.push({
        id: 'gs-' + i,
        date: rDate,
        timeSlot: rTime,
        clientName: rClient || 'Клиент с сайта',
        clientPhone: rPhone || '',
        carModel: (colMap.car !== -1 && colMap.car < row.length) ? cleanStr(row[colMap.car]) : '',
        serviceTitle: rService,
        totalPrice: (colMap.price !== -1 && colMap.price < row.length) ? (Number(row[colMap.price]) || 0) : 0,
        booking_number: bookingNum,
        boxName: (colMap.box !== -1 && colMap.box < row.length) ? (cleanStr(row[colMap.box]) || 'Бокс 1') : 'Бокс 1',
        status: (colMap.status !== -1 && colMap.status < row.length) ? (cleanStr(row[colMap.status]) || 'pending') : 'pending',
        createdAt: (colMap.createdAt !== -1 && colMap.createdAt < row.length) ? cleanStr(row[colMap.createdAt]) : ''
      });
    }
    return jsonResponse({ status: 'success', bookings: bookings });
  }

  // 3. Запрос занятых слотов по дате
  var busySlots = [];
  var dateBookings = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rDate = cleanStr(row[colMap.date]);
    if (rDate === dateParam || rDate.indexOf(dateParam) !== -1) {
      var rTime = cleanStr(row[colMap.time]);
      var rStatus = (colMap.status !== -1 && colMap.status < row.length) ? cleanStr(row[colMap.status]).toLowerCase() : 'pending';
      if (rStatus !== 'cancelled' && rStatus !== 'отменено') {
        busySlots.push(rTime);
        var rTokenDate = (colMap.token !== -1 && colMap.token < row.length) ? cleanStr(row[colMap.token]) : '';
        if (rTokenDate.indexOf('Бокс') !== -1 || rTokenDate.indexOf('бокс') !== -1) rTokenDate = '';
        var bookingNumDate = rTokenDate || ('AD-' + (1000 + i));

        var rServiceDate = (colMap.service !== -1 && colMap.service < row.length) ? cleanStr(row[colMap.service]) : '';
        if (/^\d+$/.test(rServiceDate.trim())) rServiceDate = '';

        dateBookings.push({
          id: 'gs-' + i,
          date: rDate,
          timeSlot: rTime,
          clientName: cleanStr(row[colMap.client]),
          clientPhone: cleanStr(row[colMap.phone]),
          carModel: (colMap.car !== -1 && colMap.car < row.length) ? cleanStr(row[colMap.car]) : '',
          serviceTitle: rServiceDate,
          totalPrice: (colMap.price !== -1 && colMap.price < row.length) ? (Number(row[colMap.price]) || 0) : 0,
          booking_number: bookingNumDate,
          boxName: (colMap.box !== -1 && colMap.box < row.length) ? (cleanStr(row[colMap.box]) || 'Бокс 1') : 'Бокс 1',
          status: (colMap.status !== -1 && colMap.status < row.length) ? (cleanStr(row[colMap.status]) || 'pending') : 'pending'
        });
      }
    }
  }
  return jsonResponse({ status: 'success', date: dateParam, busySlots: busySlots, bookings: dateBookings });
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Invalid JSON payload' });
  }

  // Сохранение конфигурации сайта
  if (body.action === 'saveConfig') {
    var configSheet = ss.getSheetByName('Настройки');
    if (!configSheet) {
      configSheet = ss.insertSheet('Настройки');
    }
    configSheet.getRange(1, 1).setValue(JSON.stringify(body.config));
    return jsonResponse({ status: 'success', message: 'Настройки успешно синхронизированы' });
  }

  // Обновление статуса / отмена бронирования
  if (body.action === 'updateStatus' || body.action === 'cancelBooking') {
    var sheet = getBookingsSheet(ss);
    var data = sheet.getDataRange().getDisplayValues();
    var colMap = getColumnMap(data[0]);
    var targetId = String(body.id || body.booking_number || body.token || '').trim();
    var newStatus = body.status || 'cancelled';

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rToken = colMap.token !== -1 ? cleanStr(row[colMap.token]) : '';
      var rRowId = 'gs-' + i;
      if (rToken === targetId || rRowId === targetId || (body.phone && cleanStr(row[colMap.phone]).indexOf(body.phone) !== -1)) {
        if (colMap.status !== -1) {
          sheet.getRange(i + 1, colMap.status + 1).setValue(newStatus);
        }
        return jsonResponse({ status: 'success', message: 'Статус успешно обновлен' });
      }
    }
    return jsonResponse({ status: 'not_found', message: 'Запись не найдена' });
  }

  // Создание новой записи
  var sheet = getBookingsSheet(ss);
  var data = sheet.getDataRange().getDisplayValues();
  var colMap = getColumnMap(data[0]);

  // Если колонка Номер брони отсутствует в заголовках, автоматически добавляем её в строку 1
  if (colMap.token === -1) {
    var lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1).setValue('Номер брони');
    colMap.token = lastCol;
  }
  // Если колонка Услуга отсутствует в заголовках, автоматически добавляем её в строку 1
  if (colMap.service === -1) {
    var lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1).setValue('Услуга');
    colMap.service = lastCol;
  }

  // Записываем дату, время и телефон с текстовым апострофом, чтобы Google Sheets не форматировал их как даты/формулы
  var rawDate = String(body.date || '').trim();
  var safeDate = rawDate ? (rawDate.charAt(0) === "'" ? rawDate : "'" + rawDate) : '';

  var rawTime = String(body.timeSlot || '').trim();
  var safeTime = rawTime ? (rawTime.charAt(0) === "'" ? rawTime : "'" + rawTime) : '';

  var rawPhone = String(body.clientPhone || '').trim();
  var safePhone = rawPhone ? (rawPhone.charAt(0) === "'" ? rawPhone : "'" + rawPhone) : '';

  var maxCol = 1;
  for (var k in colMap) {
    if (colMap[k] > maxCol) maxCol = colMap[k];
  }
  var newRow = new Array(maxCol);
  for (var j = 0; j < maxCol; j++) newRow[j] = '';

  newRow[colMap.date] = safeDate;
  newRow[colMap.time] = safeTime;
  newRow[colMap.client] = body.clientName || '';
  newRow[colMap.phone] = safePhone;
  newRow[colMap.car] = body.carModel || '';
  newRow[colMap.service] = body.serviceTitle || '';
  newRow[colMap.price] = body.totalPrice || 0;
  newRow[colMap.token] = body.booking_number || body.cancellation_token || '';
  newRow[colMap.box] = body.boxName || 'Бокс 1';
  newRow[colMap.status] = body.status || 'pending';
  newRow[colMap.createdAt] = "'" + Utilities.formatDate(new Date(), 'GMT+3', 'yyyy-MM-dd HH:mm');

  sheet.appendRow(newRow);

  return jsonResponse({ status: 'success', message: 'Бронирование успешно создано' });
}

function getBookingsSheet(ss) {
  var sheet = ss.getSheetByName('Бронирования') || ss.getSheetByName('Записи') || ss.getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Дата',
      'Время',
      'Клиент',
      'Телефон',
      'Автомобиль',
      'Услуга',
      'Стоимость',
      'Номер брони',
      'Бокс',
      'Статус',
      'Создано'
    ]);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  }
  return sheet;
}

function getColumnMap(headers) {
  var map = {
    date: -1,
    time: -1,
    client: -1,
    phone: -1,
    car: -1,
    service: -1,
    price: -1,
    token: -1,
    box: -1,
    status: -1,
    createdAt: -1
  };
  if (!headers || !headers.length) {
    return {
      date: 0, time: 1, client: 2, phone: 3, car: 4,
      service: 5, price: 6, token: 7, box: 8, status: 9, createdAt: 10
    };
  }

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase().trim();
    if (h.indexOf('дат') !== -1 || h === 'date') map.date = i;
    else if (h.indexOf('врем') !== -1 || h === 'time' || h.indexOf('слот') !== -1) map.time = i;
    else if (h.indexOf('клиент') !== -1 || h.indexOf('имя') !== -1 || h === 'name' || h.indexOf('нта') !== -1) map.client = i;
    else if (h.indexOf('телеф') !== -1 || h === 'phone' || h.indexOf('тел') !== -1) map.phone = i;
    else if (h.indexOf('авто') !== -1 || h.indexOf('машин') !== -1 || h === 'car') map.car = i;
    else if (h.indexOf('услуг') !== -1 || h === 'service') map.service = i;
    else if (h.indexOf('стоим') !== -1 || h.indexOf('цен') !== -1 || h === 'price') map.price = i;
    else if (h.indexOf('бокс') !== -1 || h.indexOf('пост') !== -1 || h === 'box') map.box = i;
    else if (h.indexOf('брон') !== -1 || h.indexOf('токен') !== -1 || (h.indexOf('номер') !== -1 && h.indexOf('бокс') === -1) || h === 'token' || h === 'id') map.token = i;
    else if (h.indexOf('статус') !== -1 || h === 'status') map.status = i;
    else if (h.indexOf('создан') !== -1 || h === 'created') map.createdAt = i;
  }

  if (map.date === -1) map.date = 0;
  if (map.time === -1) map.time = 1;
  if (map.client === -1) map.client = 2;
  if (map.phone === -1) map.phone = 3;
  if (map.car === -1) map.car = 4;

  return map;
}

function cleanStr(val) {
  if (val === undefined || val === null) return '';
  var s = String(val).trim();
  if (s.indexOf('#ERROR!') !== -1) return '';
  if (s.charAt(0) === "'") return s.slice(1);
  return s;
}

function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function formatTimeValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
  }
  var s = String(val).trim();
  if (/^\\d{1,2}:\\d{2}/.test(s)) {
    var parts = s.split(':');
    return parts[0].padStart(2, '0') + ':' + parts[1].slice(0, 2);
  }
  return s;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
