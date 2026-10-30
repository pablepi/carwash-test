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
