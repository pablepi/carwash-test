export interface CalendarEventParams {
  title: string;
  description: string;
  location: string;
  startTimeIso: string;
  endTimeIso: string;
  timezone: string;
  organizerName: string;
}

/**
 * Generates an RFC 5545 compliant .ics file content
 */
export function generateIcsFile(params: CalendarEventParams): string {
  const { title, description, location, startTimeIso, endTimeIso, timezone, organizerName } = params;

  const startUtc = new Date(startTimeIso);
  const endUtc = new Date(endTimeIso);

  // Format UTC dates as YYYYMMDDTHHMMSSZ
  const formatUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const dtStamp = formatUtc(new Date());
  const dtStart = formatUtc(startUtc);
  const dtEnd = formatUtc(endUtc);
  const uid = `booking-${Date.now()}@apexdetailing.com`;

  const cleanDesc = description.replace(/\n/g, '\\n');
  const cleanLoc = location.replace(/\n/g, ' ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Apex Detailing Studio//Online Booking//RU',
    'CALSCALE:GREGORIAN',
    `X-WR-TIMEZONE:${timezone}`,
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${cleanDesc}`,
    `LOCATION:${cleanLoc}`,
    `ORGANIZER;CN=${organizerName}:MAILTO:noreply@apexdetailing.com`,
    'STATUS:CONFIRMED',
    // 24 hour reminder alarm
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Напоминание о записи на мойку через 24 часа',
    'END:VALARM',
    // 2 hour reminder alarm
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Ждем вас через 2 часа на мойку',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcsFile(content: string, filename = 'booking-detailing.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
