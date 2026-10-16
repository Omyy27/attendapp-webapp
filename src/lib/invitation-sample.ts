// Contenido de ejemplo para la invitación (/pase). Reemplazar por el video y
// las fotos reales de los novios; más adelante puede venir de `weddings`.
// Fuente: Mixkit (licencia libre), misma pareja en video y galería.

export interface GalleryPhoto {
  src: string;
  alt: string;
}

const mixkit = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}`;

export const SAMPLE_HERO_VIDEO = {
  src: `${mixkit(40584)}-720.mp4`,
  poster: `${mixkit(40584)}-thumb-720-0.jpg`,
};

export const SAMPLE_PREVIEW_LINES = [
  "Tenemos algo que contarte…",
  "Después de tantos momentos juntos…",
];

export const SAMPLE_INVITATION_TEXT = [
  "Hay momentos en la vida que se esperan con el corazón, y este es uno de ellos.",
  "Con mucha alegría queremos compartir contigo el día en que uniremos nuestras vidas. Tu presencia hará nuestra celebración aún más inolvidable.",
];

export const SAMPLE_GALLERY: GalleryPhoto[] = [
  { src: `${mixkit(40601)}-thumb-720-0.jpg`, alt: "Los novios posando en el jardín" },
  { src: `${mixkit(40627)}-thumb-720-0.jpg`, alt: "Los novios tomados de la mano" },
  { src: `${mixkit(40593)}-thumb-720-0.jpg`, alt: "Los novios sonriendo" },
  { src: `${mixkit(40590)}-thumb-720-0.jpg`, alt: "Los novios en su jardín de bodas" },
  { src: `${mixkit(40596)}-thumb-720-0.jpg`, alt: "Los novios caminando juntos" },
  { src: `${mixkit(40599)}-thumb-720-0.jpg`, alt: "El reencuentro de los novios" },
  { src: `${mixkit(40586)}-thumb-720-0.jpg`, alt: "La novia con su ramo" },
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
  eyebrow: "Un secreto para ti",
  title: "El lugar cambió",
  updatedBadge: "Lugar actualizado",
  defaultMessage:
    "Por ser fiel y confirmar, te contamos que la celebración no será donde decía la invitación. Nos vemos en:",
};
