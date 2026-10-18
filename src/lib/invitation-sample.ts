// Contenido de la invitación (/pase): video de portada, fotos del carrusel y textos.
//
// Video y fotos personales: se suben a Supabase Storage con
// `node scripts/upload-media.mjs` (lee ./media-src/). Mientras `enabled` sea
// false se muestra contenido de muestra de Mixkit (licencia libre).

export interface GalleryPhoto {
  src: string;
  alt: string;
}

export const INVITATION_MEDIA = {
  /** true cuando ya subiste tu video y fotos con el script */
  enabled: true,
  /** número de fotos subidas (lo imprime el script) */
  photoCount: 8,
  /** súbelo (1 → 2…) si reemplazas archivos, para que los teléfonos no usen la copia vieja */
  version: 12,
  bucket: "invitation-media",
};

const mediaUrl = (file: string) =>
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${INVITATION_MEDIA.bucket}/${file}?v=${INVITATION_MEDIA.version}`
    : "";

export const INVITATION_MUSIC = {
  /** true cuando ya subiste media-src/music.mp3 con el script */
  enabled: false,
  /** nombre que se muestra un momento en el mini reproductor */
  title: "Nuestra canción",
  /** volumen final (0–1); en iOS lo fija el volumen del teléfono */
  volume: 0.5,
};

/** Música de fondo (vacío = sin reproductor) */
export const SAMPLE_MUSIC_SRC = INVITATION_MUSIC.enabled ? mediaUrl("music.mp3") : "";

// ---- contenido de muestra (Mixkit), usado hasta activar el propio ----
const mixkit = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}`;

const MIXKIT_VIDEO = {
  src: `${mixkit(40584)}-720.mp4`,
  poster: `${mixkit(40584)}-thumb-720-0.jpg`,
};

const MIXKIT_GALLERY: GalleryPhoto[] = [
  { src: `${mixkit(40601)}-thumb-720-0.jpg`, alt: "Los novios posando en el jardín" },
  { src: `${mixkit(40627)}-thumb-720-0.jpg`, alt: "Los novios tomados de la mano" },
  { src: `${mixkit(40593)}-thumb-720-0.jpg`, alt: "Los novios sonriendo" },
  { src: `${mixkit(40590)}-thumb-720-0.jpg`, alt: "Los novios en su jardín de bodas" },
  { src: `${mixkit(40596)}-thumb-720-0.jpg`, alt: "Los novios caminando juntos" },
  { src: `${mixkit(40599)}-thumb-720-0.jpg`, alt: "El reencuentro de los novios" },
  { src: `${mixkit(40586)}-thumb-720-0.jpg`, alt: "La novia con su ramo" },
];

const personal = INVITATION_MEDIA.enabled && !!mediaUrl("hero.mp4");

export const SAMPLE_HERO_VIDEO = personal
  ? { src: mediaUrl("hero.mp4"), poster: mediaUrl("poster.webp") }
  : MIXKIT_VIDEO;

/** Descripciones de las fotos (opcional): índice 0 = photo-1. Si faltan se usa un texto genérico. */
const PHOTO_ALTS: string[] = [];

export const SAMPLE_GALLERY: GalleryPhoto[] = personal
  ? Array.from({ length: INVITATION_MEDIA.photoCount }, (_, i) => ({
      src: mediaUrl(`photo-${i + 1}.webp`),
      alt: PHOTO_ALTS[i] || `Foto ${i + 1} de los novios`,
    }))
  : MIXKIT_GALLERY;

export const SAMPLE_PREVIEW_LINES = [
  "Tenemos algo que contarte…",
  "Después de tantos momentos juntos…",
];

export const SAMPLE_INVITATION_TEXT = [
  "Hay momentos en la vida que se esperan con el corazón, y este es uno de ellos.",
  "Con mucha alegría queremos compartir contigo el día en que uniremos nuestras vidas. Tu presencia hará nuestra celebración aún más inolvidable.",
];

export interface AvoidColor {
  name: string;
  /** 1–3 tonos representativos; una "gama" se ve como muestra dividida en franjas */
  hexes: string[];
}

export interface AvoidGroup {
  group: string;
  colors: AvoidColor[];
}

// Los hex son representativos (los novios solo indicaron nombres): afinar aquí.
export const SAMPLE_DRESS_CODE: { note: string; avoid: AvoidGroup[] } = {
  note: "Por favor evita estos tonos.",
  avoid: [
    {
      group: "Mujeres",
      colors: [
        { name: "Rosa (toda la gama)", hexes: ["#f9c5d6", "#f591b3", "#e0508a"] },
        { name: "Terracota", hexes: ["#cc6b4a"] },
        { name: "Blanco y beige", hexes: ["#ffffff", "#f1e6cf"] },
        { name: "Gris claro", hexes: ["#cfd2d6"] },
        { name: "Gris oscuro", hexes: ["#5b6068"] },
        { name: "Verde (toda la gama)", hexes: ["#9cc58a", "#4f8a4a", "#2f5d3a"] },
        { name: "Rojo", hexes: ["#d11a2a"] },
        { name: "Negro", hexes: ["#111111"] },
        { name: "Dorado", hexes: ["#d4af37"] },
      ],
    },
    {
      group: "Hombres",
      colors: [
        { name: "Gris claro", hexes: ["#cfd2d6"] },
        { name: "Gris oscuro", hexes: ["#5b6068"] },
        { name: "Blanco", hexes: ["#ffffff"] },
      ],
    },
  ],
};

export const SAMPLE_ADULTS_ONLY =
  "Amamos a sus pequeños, pero esta celebración es solo para adultos. Les pedimos asistir sin niños, de ninguna edad.";

// Textos fijos del lugar sorpresa; el mensaje principal lo escribe la novia en Ajustes.
export const SAMPLE_REVEAL_COPY = {
  confirmEyebrow: "Tu respuesta",
  confirmTitle: "Confirma tu asistencia",
  confirmText: "Al confirmar te contaremos algo especial sobre el lugar.",
  // Confirmación con quien envió la invitación (modo "organizer")
  organizerText:
    "Para confirmar tu asistencia, avísale a la persona que te envió esta invitación. Cuando lo haga, aquí se desbloqueará tu código QR de entrada.",
  organizerRevealText: "También te contaremos algo especial sobre el lugar.",
  refreshLabel: "Ya confirmé, actualizar",
  eyebrow: "Un secreto para ti",
  title: "El lugar cambió",
  updatedBadge: "Lugar actualizado",
  defaultMessage:
    "Por ser fiel y confirmar, te contamos que la celebración no será donde decía la invitación. Nos vemos en:",
};
