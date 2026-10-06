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
