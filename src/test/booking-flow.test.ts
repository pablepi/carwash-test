import { describe, it, expect } from 'vitest';
import { generateIcsFile } from '../lib/ics';
import { parseISO, format } from 'date-fns';
import { ru } from 'date-fns/locale';

describe('Booking flow data contract & safety tests', () => {
  it('generates compliant booking data compatible with BookingSuccess and MyBooking', () => {
    const selectedSlotIso = '2026-10-30T15:30:00+03:00';
    const activeDuration = 60;
    const startDate = new Date(selectedSlotIso);
    const endDate = new Date(startDate.getTime() + activeDuration * 60 * 1000);
    const token = 'AD-7892';

    const bookingData = {
      id: `book-${Date.now()}`,
      token,
      booking_number: token,
      cancellation_token: token,
      tenantSlug: 'aquadrive',
      boxId: 'box-1',
      box_id: 'box-1',
      boxName: 'Бокс 1',
      box_name: 'Бокс 1',
      startTimeIso: startDate.toISOString(),
      endTimeIso: endDate.toISOString(),
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      timeStr: '15:30',
      serviceTitle: 'Экспресс-мойка (Легковая)',
      service_title: 'Экспресс-мойка (Легковая)',
      servicePrice: 1200,
      total_price: 1200,
      serviceDurationMinutes: activeDuration,
      clientName: 'Иван',
      client_name: 'Иван',
      clientPhone: '+7 (999) 111-22-33',
      client_phone: '+7 (999) 111-22-33',
      carModel: 'BMW 3 [А 123 АА 77]',
      car_model: 'BMW 3 [А 123 АА 77]',
      plate_number: 'А 123 АА 77',
      carPlate: 'А 123 АА 77',
      carCategory: 'sedan',
      status: 'pending',
      address: 'г. Москва, ул. Автозаводская, д. 23',
      createdAt: new Date().toISOString(),
    };

    // Verify properties required by BookingSuccess
    expect(bookingData.start_time).toBeDefined();
    expect(bookingData.total_price).toBe(1200);
    expect(bookingData.booking_number).toBe('AD-7892');
    expect(bookingData.service_title).toBe('Экспресс-мойка (Легковая)');

    // Verify date formatting doesn't throw
    const parsedStart = parseISO(bookingData.start_time);
    expect(!isNaN(parsedStart.getTime())).toBe(true);
    const dateFormatted = format(parsedStart, 'd MMMM yyyy (EEEE)', { locale: ru });
    expect(dateFormatted).toContain('2026');

    // Verify ICS generation works
    const icsContent = generateIcsFile({
      title: `${bookingData.service_title} | AquaDrive`,
      description: `Авто: ${bookingData.car_model}\\nСумма: ${bookingData.total_price} ₽\\nКод отмены: ${bookingData.cancellation_token}`,
      location: bookingData.address,
      startTimeIso: bookingData.start_time,
      endTimeIso: bookingData.end_time,
      timezone: 'Europe/Moscow',
      organizerName: 'AquaDrive',
    });

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('SUMMARY:Экспресс-мойка (Легковая) | AquaDrive');
    expect(icsContent).toContain('AD-7892');
  });

  it('safely handles missing or fallback fields without throwing', () => {
    const rawBooking: any = {};
    const rawStartTime = rawBooking?.start_time || rawBooking?.startTimeIso;
    let validStart = new Date();
    if (rawStartTime) {
      try {
        const parsed = typeof rawStartTime === 'string' ? parseISO(rawStartTime) : new Date(rawStartTime);
        if (!isNaN(parsed.getTime())) {
          validStart = parsed;
        }
      } catch {}
    }

    expect(!isNaN(validStart.getTime())).toBe(true);

    const bookingNumber = rawBooking?.booking_number || rawBooking?.cancellation_token || rawBooking?.token || 'AD-1001';
    const totalPrice = Number(rawBooking?.total_price ?? rawBooking?.servicePrice ?? 0);

    expect(bookingNumber).toBe('AD-1001');
    expect(totalPrice).toBe(0);
    expect(totalPrice.toLocaleString('ru-RU')).toBe('0');
  });
});
