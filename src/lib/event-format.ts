// Formato de horas y fechas del evento. Las horas se guardan como 'HH:MM' (24 h).

/** '17:00' → '5:00 p.m.' (vacío si no es una hora válida) */
export function formatTime(hhmm?: string | null): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return "";
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return "";
  return new Date(Date.UTC(2000, 0, 1, hours, minutes)).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

/**
 * Fecha como día de calendario, sin depender de la zona horaria de quien la mira.
 * Acepta '2026-10-17' o un ISO con hora ('2026-10-17T00:00:00.000Z'): solo usa
 * la parte de la fecha. Con `weekday`: 'sábado, 17 de octubre de 2026'.
 */
export function formatLongDate(isoDate?: string | null, weekday = true): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || "");
  if (!m) return "";
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString("es-MX", {
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Fecha del evento ('weddings.event_date', TIMESTAMPTZ guardado a medianoche UTC).
 * Es un día de calendario, no un instante: se formatea siempre en UTC. Si se usara
 * la zona local, en América se mostraría un día antes (23/dic → 22 de diciembre).
 */
export function formatEventDate(eventDate?: string | null, weekday = false): string {
  return formatLongDate(eventDate, weekday);
}
