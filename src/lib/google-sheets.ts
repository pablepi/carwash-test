export const DEFAULT_GOOGLE_SHEETS_URL =
  'https://script.google.com/macros/s/AKfycbx29aSPAPewTU-NIhljGt3yhgC7tl3YYTvAfxv88DgdfQ06_Jubx4h3E9FrzAT00meGAg/exec';

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
 */
export async function sendBookingToGoogleSheets(
  booking: GoogleSheetsBookingPayload,
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<{ success: boolean; message?: string }> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  const payload = {
    action: 'createBooking',
    date: booking.date,
    timeSlot: booking.timeSlot,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
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

/**
 * Fetches all bookings from Google Sheets for the admin dashboard (Timeline and History).
 * Works across any device (phone, laptop, tablet).
 */
export async function fetchAllBookingsFromGoogleSheets(
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<RemoteBookingRecord[]> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  try {
    const res = await fetch(`${url}?action=getAllBookings`, {
      method: 'GET',
    });
    if (!res.ok) return [];
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.bookings)) {
      return data.bookings.map((b: any, idx: number) => ({
        id: b.id || `gs-${idx}`,
        date: b.date || '',
        timeSlot: b.timeSlot || '12:00',
        clientName: b.clientName || 'Клиент с сайта',
        clientPhone: b.clientPhone || '+7 (999) 000-00-00',
        carModel: b.carModel || 'Автомобиль',
        serviceTitle: b.serviceTitle || 'Услуга',
        totalPrice: Number(b.totalPrice) || 0,
        booking_number: b.booking_number || `AD-${1000 + idx}`,
        boxName: b.boxName || 'Бокс 1',
        status: (b.status === 'cancelled' ? 'cancelled' : b.status === 'completed' ? 'completed' : b.status === 'in_progress' ? 'in_progress' : 'pending') as any,
        createdAt: b.createdAt || '',
      }));
    }

    return [];
  } catch (err) {
    console.warn('Could not fetch all bookings from Google Sheets:', err);
    return [];
  }
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
      return data.busySlots.map((s: any) => (typeof s === 'string' ? s : s?.timeSlot || String(s)));
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
 *  - Real-time booking saving
 *  - GET all bookings for Admin on any device
 *  - Date-based slot checking (handles Date objects and strings accurately)
 *  - Config sync across devices
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT ДЛЯ АВТОМОЙКИ И ДЕТЕЙЛИНГА
 * Инструкция:
 * 1. Откройте вашу Google Таблицу
 * 2. В верхнем меню выберите: Расширения (Extensions) -> Apps Script
 * 3. Полностью сотрите всё содержимое и вставьте этот код
 * 4. Нажмите «Развернуть» (Deploy) -> «Новое развертывание» (New deployment)
 * 5. Тип: «Веб-приложение» (Web app)
 * 6. Конфигурация:
 *    - Описание: "Синхронизация автомойки"
 *    - Запуск от имени: "Меня" (Me)
 *    - У кого есть доступ: "Все" (Anyone) — это обязательно!
 * 7. Нажмите «Развернуть», предоставьте доступ аккаунту Google и скопируйте полученную ссылку (exec).
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  var dateParam = (e && e.parameter && e.parameter.date) || '';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Получение настроек сайта (для синхронизации между телефоном и ПК)
  if (action === 'getConfig') {
    var configSheet = ss.getSheetByName('Настройки');
    if (!configSheet) {
      return jsonResponse({ status: 'not_found', config: null });
    }
    var configVal = configSheet.getRange(1, 1).getValue();
    try {
      var parsed = JSON.parse(configVal);
      return jsonResponse({ status: 'success', config: parsed });
    } catch (err) {
      return jsonResponse({ status: 'error', message: 'Config parsing error' });
    }
  }

  // 2. Получение всех записей для админ-панели на любом устройстве
  if (action === 'getAllBookings' || action === 'all' || !dateParam) {
    var sheet = getBookingsSheet(ss);
    var data = sheet.getDataRange().getValues();
    var bookings = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1] && !row[2]) continue;

      var rowDate = formatDateValue(row[0]);
      var rowTime = formatTimeValue(row[1]);

      bookings.push({
        id: 'gs-' + i,
        date: rowDate,
        timeSlot: rowTime,
        clientName: String(row[2] || ''),
        clientPhone: String(row[3] || ''),
        carModel: String(row[4] || ''),
        serviceTitle: String(row[5] || ''),
        totalPrice: Number(row[6]) || 0,
        booking_number: String(row[7] || ''),
        boxName: String(row[8] || 'Бокс 1'),
        status: String(row[9] || 'pending'),
        createdAt: row[10] ? formatDateValue(row[10]) : ''
      });
    }
    return jsonResponse({ status: 'success', bookings: bookings });
  }

  // 3. Получение занятых слотов на указанную дату
  var sheet = getBookingsSheet(ss);
  var data = sheet.getDataRange().getValues();
  var busySlots = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowDate = formatDateValue(row[0]);
    if (rowDate === dateParam) {
      var rowStatus = String(row[9] || '').toLowerCase();
      if (rowStatus !== 'cancelled' && rowStatus !== 'отменено') {
        busySlots.push(formatTimeValue(row[1]));
      }
    }
  }
  return jsonResponse({ status: 'success', date: dateParam, busySlots: busySlots });
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ status: 'error', message: 'Invalid JSON payload' });
  }

  // Сохранение настроек сайта
  if (body.action === 'saveConfig') {
    var configSheet = ss.getSheetByName('Настройки');
    if (!configSheet) {
      configSheet = ss.insertSheet('Настройки');
    }
    configSheet.getRange(1, 1).setValue(JSON.stringify(body.config));
    return jsonResponse({ status: 'success', message: 'Настройки успешно синхронизированы' });
  }

  // Обновление статуса записи
  if (body.action === 'updateStatus' && (body.booking_number || body.id)) {
    var sheet = getBookingsSheet(ss);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var num = String(data[i][7] || '');
      var rowId = 'gs-' + i;
      if (num === body.booking_number || rowId === body.id) {
        sheet.getRange(i + 1, 10).setValue(body.status);
        return jsonResponse({ status: 'success', message: 'Статус обновлен' });
      }
    }
    return jsonResponse({ status: 'not_found', message: 'Запись не найдена' });
  }

  // Создание новой записи
  var sheet = getBookingsSheet(ss);
  sheet.appendRow([
    body.date || '',
    body.timeSlot || '',
    body.clientName || '',
    body.clientPhone || '',
    body.carModel || '',
    body.serviceTitle || '',
    body.totalPrice || 0,
    body.booking_number || body.cancellation_token || '',
    body.boxName || 'Бокс 1',
    body.status || 'pending',
    new Date()
  ]);

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
