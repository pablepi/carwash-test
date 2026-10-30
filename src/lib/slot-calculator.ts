import { addMinutes, isBefore, isAfter, isEqual } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { SlotAvailability, DayAvailability } from '@/types/booking';

export interface BoxScheduleInfo {
  id: string;
  name: string;
  isActive: boolean;
}

export interface BusyInterval {
  boxId: string;
  startTime: Date;
  bufferedEndTime: Date;
}

export interface SlotCalculationParams {
  targetDate: string; // "YYYY-MM-DD"
  timezone: string; // e.g. "Europe/Moscow"
  openingHour: string; // "09:00"
  closingHour: string; // "22:00"
  slotIntervalMinutes: number; // e.g. 30
  serviceDurationMinutes: number; // e.g. 90 or 1800 (30 hours)
  bufferMinutes: number; // e.g. 15
  workDays: number[]; // e.g. [0, 1, 2, 3, 4, 5, 6]
  boxes: BoxScheduleInfo[];
  busyIntervals: BusyInterval[];
  nowUtc?: Date; // For filtering out past slots
}

/**
 * Checks if interval [candidateStart, candidateBufferedEnd) collides with [busyStart, busyBufferedEnd)
 */
export function isIntervalColliding(
  candidateStart: Date,
  candidateBufferedEnd: Date,
  busyStart: Date,
  busyBufferedEnd: Date
): boolean {
  // Overlap condition for half-open intervals [A, B) and [C, D): A < D && B > C
  return isBefore(candidateStart, busyBufferedEnd) && isAfter(candidateBufferedEnd, busyStart);
}

/**
 * Computes slot availability for a given day respecting studio working hours,
 * timezone, buffer time, box concurrency, and multi-day continuous bookings.
 */
export function calculateAvailableSlots(params: SlotCalculationParams): DayAvailability {
  const {
    targetDate,
    timezone,
    openingHour,
    closingHour,
    slotIntervalMinutes,
    serviceDurationMinutes,
    bufferMinutes,
    workDays,
    boxes,
    busyIntervals,
    nowUtc = new Date(),
  } = params;

  // Active boxes only
  const activeBoxes = boxes.filter((b) => b.isActive);
  if (activeBoxes.length === 0) {
    return { dateIso: targetDate, isWorkDay: false, slots: [] };
  }

  // Parse target date components
  const [yearStr, monthStr, dayStr] = targetDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Construct day boundary in the studio's timezone
  // We represent local time in target timezone
  const [openH, openM] = openingHour.split(':').map((v) => parseInt(v, 10));
  const [closeH, closeM] = closingHour.split(':').map((v) => parseInt(v, 10));

  // Check day of week in studio's timezone
  const sampleLocalDay = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = toZonedTime(sampleLocalDay, timezone).getDay();

  if (!workDays.includes(dayOfWeek)) {
    return { dateIso: targetDate, isWorkDay: false, slots: [] };
  }

  // Day start and Day end in UTC converted from Studio Timezone
  // Note: Local time string format YYYY-MM-DDTHH:mm:ss
  const pad = (n: number) => n.toString().padStart(2, '0');
  const openLocalIso = `${targetDate}T${pad(openH)}:${pad(openM)}:00`;
  const closeLocalIso = `${targetDate}T${pad(closeH)}:${pad(closeM)}:00`;

  const dayStartTimeUtc = fromZonedTime(openLocalIso, timezone);
  const dayEndTimeUtc = fromZonedTime(closeLocalIso, timezone);

  const slots: SlotAvailability[] = [];

  let currentSlotStartUtc = dayStartTimeUtc;

  // Step through day in slotIntervalMinutes
  while (isBefore(currentSlotStartUtc, dayEndTimeUtc)) {
    const timeStr = formatInTimeZone(currentSlotStartUtc, timezone, 'HH:mm');
    const dateTimeIso = currentSlotStartUtc.toISOString();

    // Check if slot start is already in the past
    if (isBefore(currentSlotStartUtc, nowUtc) || isEqual(currentSlotStartUtc, nowUtc)) {
      slots.push({
        timeStr,
        dateTimeIso,
        isAvailable: false,
        reason: 'past',
      });
      currentSlotStartUtc = addMinutes(currentSlotStartUtc, slotIntervalMinutes);
      continue;
    }

    // Candidate interval: [Start, Start + Duration + Buffer)
    const candidateServiceEndUtc = addMinutes(currentSlotStartUtc, serviceDurationMinutes);
    const candidateBufferedEndUtc = addMinutes(candidateServiceEndUtc, bufferMinutes);

    // Multi-day detailing rule:
    // If the service fits within regular day (duration <= working day length),
    // then candidateServiceEndUtc cannot exceed dayEndTimeUtc.
    // If the service is multi-day (e.g. > 12 hours / 720 min), it spans across closing hours
    // and holds the box continuously.
    const isMultiDayService = serviceDurationMinutes > (closeH * 60 + closeM - (openH * 60 + openM));

    if (!isMultiDayService && isAfter(candidateServiceEndUtc, dayEndTimeUtc)) {
      slots.push({
        timeStr,
        dateTimeIso,
        isAvailable: false,
        reason: 'outside_hours',
      });
      currentSlotStartUtc = addMinutes(currentSlotStartUtc, slotIntervalMinutes);
      continue;
    }

    // Check if at least one active box is completely free of colliding bookings
    let availableBox: BoxScheduleInfo | null = null;

    for (const box of activeBoxes) {
      // Find any collision for this box
      const hasCollision = busyIntervals.some((busy) => {
        if (busy.boxId !== box.id) return false;
        return isIntervalColliding(
          currentSlotStartUtc,
          candidateBufferedEndUtc,
          busy.startTime,
          busy.bufferedEndTime
        );
      });

      if (!hasCollision) {
        availableBox = box;
        break; // Found an open box!
      }
    }

    if (availableBox) {
      slots.push({
        timeStr,
        dateTimeIso,
        isAvailable: true,
        boxId: availableBox.id,
        boxName: availableBox.name,
      });
    } else {
      slots.push({
        timeStr,
        dateTimeIso,
        isAvailable: false,
        reason: 'booked',
      });
    }

    currentSlotStartUtc = addMinutes(currentSlotStartUtc, slotIntervalMinutes);
  }

  return {
    dateIso: targetDate,
    isWorkDay: true,
    slots,
  };
}
