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
 * Always formats phone with an apostrophe if it starts with '+' to prevent #ERROR! formula parse error.
 */
export async function sendBookingToGoogleSheets(
  booking: GoogleSheetsBookingPayload,
  scriptUrl: string = DEFAULT_GOOGLE_SHEETS_URL
): Promise<{ success: boolean; message?: string }> {
  const url = scriptUrl?.trim() || DEFAULT_GOOGLE_SHEETS_URL;
  const rawPhone = (booking.clientPhone || '').trim();
  // Prefix with apostrophe if it starts with '+' so Google Sheets never parses it as a formula (#ERROR!)
  const safePhone = rawPhone.startsWith('+') ? `'${rawPhone}` : rawPhone;

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
      return data.bookings.map((b: any, idx: number) => {
        let cleanPhone = String(b.clientPhone || '').trim();
        if (cleanPhone.startsWith("'")) cleanPhone = cleanPhone.slice(1);
        if (cleanPhone.includes('#ERROR!')) cleanPhone = '';

        return {
          id: b.id || `gs-${idx}`,
          date: b.date || '',
          timeSlot: b.timeSlot || '12:00',
          clientName: b.clientName || 'Клиент с сайта',
          clientPhone: cleanPhone || '+7 (999) 000-00-00',
          carModel: b.carModel || 'Автомобиль',
          serviceTitle: b.serviceTitle || 'Услуга',
          totalPrice: Number(b.totalPrice) || 0,
          booking_number: b.booking_number || `AD-${1000 + idx}`,
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
    }

    // Fallback: If script only supports ?date=, try fetching for today
    if (data.status === 'error' && data.message?.includes('date')) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const dateRes = await fetch(`${url}?date=${encodeURIComponent(todayStr)}`);
      if (dateRes.ok) {
        const dateData = await dateRes.json();
        if (dateData.status === 'success' && Array.isArray(dateData.bookings)) {
          return dateData.bookings;
        }
      }
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
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return jsonResponse({ status: 'success', bookings: [], busySlots: [] });
  }

  var colMap = getColumnMap(data[0]);

  if (action === 'getAllBookings' || action === 'all' || !dateParam) {
    var bookings = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rDate = formatDateValue(row[colMap.date]);
      var rTime = formatTimeValue(row[colMap.time]);
      var rClient = cleanStr(row[colMap.client]);
      var rPhone = cleanStr(row[colMap.phone]);

      if (!rDate && !rTime && !rClient && !rPhone) continue;

      bookings.push({
        id: 'gs-' + i,
        date: rDate,
        timeSlot: rTime,
        clientName: rClient || 'Клиент с сайта',
        clientPhone: rPhone || '',
        carModel: cleanStr(row[colMap.car]) || '',
        serviceTitle: cleanStr(row[colMap.service]) || '',
        totalPrice: Number(row[colMap.price]) || 0,
        booking_number: cleanStr(row[colMap.token]) || ('AD-' + (1000 + i)),
        boxName: cleanStr(row[colMap.box]) || 'Бокс 1',
        status: cleanStr(row[colMap.status]) || 'pending',
        createdAt: formatDateValue(row[colMap.createdAt])
      });
    }
    return jsonResponse({ status: 'success', bookings: bookings });
  }

  // 3. Запрос занятых слотов по дате
  var busySlots = [];
  var dateBookings = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rDate = formatDateValue(row[colMap.date]);
    if (rDate === dateParam) {
      var rTime = formatTimeValue(row[colMap.time]);
      var rStatus = cleanStr(row[colMap.status]).toLowerCase();
      if (rStatus !== 'cancelled' && rStatus !== 'отменено') {
        busySlots.push(rTime);
        dateBookings.push({
          id: 'gs-' + i,
          date: rDate,
          timeSlot: rTime,
          clientName: cleanStr(row[colMap.client]),
          clientPhone: cleanStr(row[colMap.phone]),
          carModel: cleanStr(row[colMap.car]),
          serviceTitle: cleanStr(row[colMap.service]),
          totalPrice: Number(row[colMap.price]) || 0,
          booking_number: cleanStr(row[colMap.token]) || ('AD-' + (1000 + i)),
          boxName: cleanStr(row[colMap.box]) || 'Бокс 1',
          status: cleanStr(row[colMap.status]) || 'pending'
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

  // Создание новой записи
  var sheet = getBookingsSheet(ss);
  var data = sheet.getDataRange().getValues();
  var colMap = getColumnMap(data[0]);

  // Телефон оборачиваем в текстовый апостроф, чтобы не было ошибки формулы #ERROR!
  var rawPhone = String(body.clientPhone || '').trim();
  var safePhone = rawPhone;
  if (rawPhone && (rawPhone.charAt(0) === '+' || rawPhone.charAt(0) === '=')) {
    safePhone = "'" + rawPhone;
  }

  // Формируем строку в соответствии с порядком колонок в таблице
  var maxCol = 1;
  for (var k in colMap) {
    if (colMap[k] > maxCol) maxCol = colMap[k];
  }
  var newRow = new Array(maxCol);
  for (var j = 0; j < maxCol; j++) newRow[j] = '';

  newRow[colMap.date] = body.date || '';
  newRow[colMap.time] = body.timeSlot || '';
  newRow[colMap.client] = body.clientName || '';
  newRow[colMap.phone] = safePhone;
  newRow[colMap.car] = body.carModel || '';
  newRow[colMap.service] = body.serviceTitle || '';
  newRow[colMap.price] = body.totalPrice || 0;
  newRow[colMap.token] = body.booking_number || body.cancellation_token || '';
  newRow[colMap.box] = body.boxName || 'Бокс 1';
  newRow[colMap.status] = body.status || 'pending';
  newRow[colMap.createdAt] = new Date();

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
    date: 0,
    time: 1,
    client: 2,
    phone: 3,
    car: 4,
    service: 5,
    price: 6,
    token: 7,
    box: 8,
    status: 9,
    createdAt: 10
  };
  if (!headers || !headers.length) return map;

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i] || '').toLowerCase().trim();
    if (h.indexOf('дат') !== -1 || h === 'date') map.date = i;
    else if (h.indexOf('врем') !== -1 || h === 'time' || h.indexOf('слот') !== -1) map.time = i;
    else if (h.indexOf('клиент') !== -1 || h.indexOf('имя') !== -1 || h === 'name' || h.indexOf('нта') !== -1) map.client = i;
    else if (h.indexOf('телеф') !== -1 || h === 'phone' || h.indexOf('тел') !== -1) map.phone = i;
    else if (h.indexOf('авто') !== -1 || h.indexOf('машин') !== -1 || h === 'car') map.car = i;
    else if (h.indexOf('услуг') !== -1 || h === 'service') map.service = i;
    else if (h.indexOf('стоим') !== -1 || h.indexOf('цен') !== -1 || h === 'price') map.price = i;
    else if (h.indexOf('брон') !== -1 || h.indexOf('номер') !== -1 || h === 'token' || h === 'id') map.token = i;
    else if (h.indexOf('бокс') !== -1 || h === 'box') map.box = i;
    else if (h.indexOf('статус') !== -1 || h === 'status') map.status = i;
    else if (h.indexOf('создан') !== -1 || h === 'created') map.createdAt = i;
  }
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
