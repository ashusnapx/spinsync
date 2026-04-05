function formatCalendarDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

interface CalendarEventInput {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  location?: string;
}

export function buildGoogleCalendarUrl(event: CalendarEventInput) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.description,
    dates: `${formatCalendarDate(event.startAt)}/${formatCalendarDate(
      event.endAt
    )}`,
  });

  if (event.location) {
    params.set("location", event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildAppleCalendarDataUrl(event: CalendarEventInput) {
  const uid = `dhobiq-${formatCalendarDate(event.startAt)}-${Math.random()
    .toString(36)
    .slice(2, 10)}@dhobiq.app`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DhobiQ//Machine Reminder//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(event.startAt)}`,
    `DTEND:${formatCalendarDate(event.endAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.location
      ? [`LOCATION:${escapeIcsText(event.location)}`]
      : []),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:DhobiQ pickup reminder",
    "TRIGGER:-PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(
    lines.join("\r\n")
  )}`;
}
