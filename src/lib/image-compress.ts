export interface CompressedPhoto {
  full: Blob;
  thumb: Blob;
  ext: "webp" | "jpg";
  width: number;
  height: number;
}

const FULL_MAX = 1600;
const THUMB_MAX = 480;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Respeta la orientación EXIF de las fotos de cámara
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Safari antiguo / HEIC no soportado por createImageBitmap
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function render(
  source: ImageBitmap | HTMLImageElement,
  maxSide: number,
  quality: number,
  preferWebp: boolean
) {
  const srcW = source.width;
  const srcH = source.height;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  // Safari no exporta WebP: toBlob devuelve PNG o null, se cae a JPEG
  if (preferWebp) {
    const webp = await toBlob(canvas, "image/webp", quality);
    if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp" as const, canvas };
  }
  const jpg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpg) throw new Error("No se pudo procesar la imagen");
  return { blob: jpg, ext: "jpg" as const, canvas };
}

/** Reduce una foto del teléfono a ~1600px y genera su miniatura, en el mismo formato */
export async function compressPhoto(file: File): Promise<CompressedPhoto> {
  const source = await loadBitmap(file);
  try {
    const full = await render(source, FULL_MAX, 0.82, true);
    const thumb = await render(source, THUMB_MAX, 0.75, full.ext === "webp");
    return {
      full: full.blob,
      thumb: thumb.blob,
      ext: full.ext,
      width: full.canvas.width,
      height: full.canvas.height,
    };
  } finally {
    if ("close" in source) source.close();
  }
}
