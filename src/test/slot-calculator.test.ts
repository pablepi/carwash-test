import { describe, it, expect } from 'vitest';
import { calculateAvailableSlots, isIntervalColliding } from '../lib/slot-calculator';
import { addMinutes, parseISO } from 'date-fns';

describe('Slot Availability Calculator Engine', () => {
  const mockBoxes = [
    { id: 'box-1', name: 'Бокс 1 (Детейлинг)', isActive: true },
    { id: 'box-2', name: 'Бокс 2 (Мойка)', isActive: true },
  ];

  it('correctly detects interval collisions with buffer', () => {
    const candidateStart = new Date('2026-10-26T10:00:00Z');
    const candidateBufferedEnd = new Date('2026-10-26T11:15:00Z');

    const busyStart = new Date('2026-10-26T11:00:00Z');
    const busyBufferedEnd = new Date('2026-10-26T12:00:00Z');

    // Overlap: candidate buffer extends to 11:15, while next car starts at 11:00
    expect(isIntervalColliding(candidateStart, candidateBufferedEnd, busyStart, busyBufferedEnd)).toBe(true);

    // No overlap: candidate ends before busy starts
    const earlyBufferedEnd = new Date('2026-10-26T10:45:00Z');
    expect(isIntervalColliding(candidateStart, earlyBufferedEnd, busyStart, busyBufferedEnd)).toBe(false);
  });

  it('generates day slots within working hours in specified timezone', () => {
    const result = calculateAvailableSlots({
      targetDate: '2026-10-26',
      timezone: 'Europe/Moscow',
      openingHour: '10:00',
      closingHour: '12:00',
      slotIntervalMinutes: 30,
      serviceDurationMinutes: 30,
      bufferMinutes: 15,
      workDays: [0, 1, 2, 3, 4, 5, 6],
      boxes: mockBoxes,
      busyIntervals: [],
      nowUtc: new Date('2026-10-26T00:00:00Z'),
    });

    expect(result.isWorkDay).toBe(true);
    // Slots: 10:00, 10:30, 11:00, 11:30 (12:00 is closing)
    expect(result.slots.map((s) => s.timeStr)).toEqual(['10:00', '10:30', '11:00', '11:30']);
    expect(result.slots.every((s) => s.isAvailable)).toBe(true);
  });

  it('marks slot as booked only if all active boxes are occupied', () => {
    // Box 1 is booked from 10:00 to 11:00 (+15m buffer = 11:15)
    // Box 2 is free!
    const busyIntervals = [
      {
        boxId: 'box-1',
        startTime: parseISO('2026-10-26T07:00:00Z'), // 10:00 Moscow (UTC+3)
        bufferedEndTime: parseISO('2026-10-26T08:15:00Z'), // 11:15 Moscow
      },
    ];

    const result = calculateAvailableSlots({
      targetDate: '2026-10-26',
      timezone: 'Europe/Moscow',
      openingHour: '10:00',
      closingHour: '12:00',
      slotIntervalMinutes: 30,
      serviceDurationMinutes: 60,
      bufferMinutes: 15,
      workDays: [0, 1, 2, 3, 4, 5, 6],
      boxes: mockBoxes,
      busyIntervals,
      nowUtc: new Date('2026-10-26T00:00:00Z'),
    });

    // 10:00 slot should be assigned to box-2 because box-1 is booked
    const slot1000 = result.slots.find((s) => s.timeStr === '10:00');
    expect(slot1000?.isAvailable).toBe(true);
    expect(slot1000?.boxId).toBe('box-2');

    // Now if we also book box-2 for 10:00, the slot becomes unavailable
    const busyBothBoxes = [
      ...busyIntervals,
      {
        boxId: 'box-2',
        startTime: parseISO('2026-10-26T07:00:00Z'),
        bufferedEndTime: parseISO('2026-10-26T08:15:00Z'),
      },
    ];

    const resultBoth = calculateAvailableSlots({
      targetDate: '2026-10-26',
      timezone: 'Europe/Moscow',
      openingHour: '10:00',
      closingHour: '12:00',
      slotIntervalMinutes: 30,
      serviceDurationMinutes: 60,
      bufferMinutes: 15,
      workDays: [0, 1, 2, 3, 4, 5, 6],
      boxes: mockBoxes,
      busyIntervals: busyBothBoxes,
      nowUtc: new Date('2026-10-26T00:00:00Z'),
    });

    const slot1000Both = resultBoth.slots.find((s) => s.timeStr === '10:00');
    expect(slot1000Both?.isAvailable).toBe(false);
    expect(slot1000Both?.reason).toBe('booked');
  });

  it('supports multi-day detailing (e.g. 30 hours) continuously blocking box', () => {
    // 30 hour service = 1800 minutes
    const multiDayBusy = [
      {
        boxId: 'box-1',
        startTime: parseISO('2026-10-26T07:00:00Z'), // starts 10:00 Oct 26
        bufferedEndTime: addMinutes(parseISO('2026-10-26T07:00:00Z'), 1800 + 15), // spans to Oct 27 16:15
      },
    ];

    // Check availability on Oct 27
    const resultNextDay = calculateAvailableSlots({
      targetDate: '2026-10-27',
      timezone: 'Europe/Moscow',
      openingHour: '10:00',
      closingHour: '14:00',
      slotIntervalMinutes: 60,
      serviceDurationMinutes: 60,
      bufferMinutes: 15,
      workDays: [0, 1, 2, 3, 4, 5, 6],
      boxes: [{ id: 'box-1', name: 'Бокс 1', isActive: true }], // only box 1
      busyIntervals: multiDayBusy,
      nowUtc: new Date('2026-10-26T00:00:00Z'),
    });

    // All slots on Oct 27 before 16:15 must be unavailable for Box 1
    expect(resultNextDay.slots.every((s) => !s.isAvailable)).toBe(true);
  });
});
