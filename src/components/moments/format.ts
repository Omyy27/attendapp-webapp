export const formatClock = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

/** "Hoy", "Ayer" o la fecha, para separar el chat por días */
export function formatDay(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

// Clases completas (no interpoladas) para que Tailwind las detecte
const TONES = [
  { name: "text-gold-deep", avatar: "bg-gold-faint text-gold-deep" },
  { name: "text-sky", avatar: "bg-sky/15 text-sky" },
  { name: "text-inv-rose-deep", avatar: "bg-inv-rose/15 text-inv-rose-deep" },
  { name: "text-inv-olive", avatar: "bg-inv-olive/15 text-inv-olive" },
] as const;

/** Color estable por autor para su nombre y avatar */
export function authorTone(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(hash) % TONES.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}
