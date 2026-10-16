// Sube el video y las fotos personales de la invitación a Supabase Storage.
//
//   Originales en ./media-src/:
//     video.mp4        video de portada (MP4 H.264, sin audio, < ~10 MB ideal)
//     poster.jpg       (opcional) portada mientras carga el video
//     photos/          6–8 fotos (01.jpg, 02.jpg… se ordenan por nombre)
//
//   node scripts/upload-media.mjs             # procesa y sube
//   node scripts/upload-media.mjs --dry-run   # solo procesa y muestra tamaños
//   node scripts/upload-media.mjs --src=otra-carpeta
//
// Las fotos se giran por EXIF, se recortan a 4:5, se reducen a 1200 px de ancho
// y se convierten a WebP. El video se sube sin transformar.

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BUCKET = "invitation-media";
const PHOTO_WIDTH = 1200;
const PHOTO_HEIGHT = 1500; // 4:5, el formato del carrusel
const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1920; // vertical: el video cubre la pantalla del celular
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const MAX_VIDEO_MB = 15;
const CACHE = "31536000";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const srcArg = args.find((a) => a.startsWith("--src="));
const SRC = path.resolve(srcArg ? srcArg.slice(6) : "media-src");

const kb = (n) => `${Math.round(n / 1024)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function loadEnv() {
  const env = { ...process.env };
  try {
    const text = await readFile(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=(.*)$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
  return env;
}

/** Busca `base` + una de `exts` sin distinguir mayúsculas (video.MP4 == video.mp4) */
async function findFile(dir, base, exts) {
  if (!existsSync(dir)) return null;
  const files = await readdir(dir);
  for (const ext of exts) {
    const wanted = (base + ext).toLowerCase();
    const match = files.find((f) => f.toLowerCase() === wanted);
    if (match) return path.join(dir, match);
  }
  return null;
}

async function toWebp(input, width, height, quality = 80) {
  return sharp(input)
    .rotate() // respeta la orientación EXIF del celular
    .resize(width, height, { fit: "cover", position: "attention" })
    .webp({ quality })
    .toBuffer();
}

async function main() {
  if (!existsSync(SRC)) {
    console.error(`No existe la carpeta ${SRC}. Crea media-src/ con video.mp4 y photos/.`);
    process.exit(1);
  }

  // ---- fotos ----
  const photosDir = path.join(SRC, "photos");
  const photoFiles = existsSync(photosDir)
    ? (await readdir(photosDir))
        .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];

  const uploads = []; // { name, body, contentType }
  const skipped = [];
  for (const file of photoFiles) {
    try {
      const body = await toWebp(path.join(photosDir, file), PHOTO_WIDTH, PHOTO_HEIGHT);
      uploads.push({ name: `photo-${uploads.length + 1}.webp`, body, contentType: "image/webp", from: file });
    } catch (e) {
      skipped.push(`${file} (${e.message})`);
    }
  }
  const heic = (existsSync(photosDir) ? await readdir(photosDir) : []).filter((f) =>
    /\.hei[cf]$/i.test(f)
  );
  if (heic.length) {
    skipped.push(...heic.map((f) => `${f} (HEIC no soportado: expórtala a JPG)`));
  }

  // ---- portada ----
  const posterSrc =
    (await findFile(SRC, "poster", [".jpg", ".jpeg", ".png", ".webp"])) ||
    (photoFiles[0] ? path.join(photosDir, photoFiles[0]) : null);
  if (posterSrc) {
    uploads.push({
      name: "poster.webp",
      body: await toWebp(posterSrc, POSTER_WIDTH, POSTER_HEIGHT, 75),
      contentType: "image/webp",
      from: path.basename(posterSrc),
    });
  }

  // ---- video ----
  const videoSrc = await findFile(SRC, "video", [".mp4"]);
  if (videoSrc) {
    const size = (await stat(videoSrc)).size;
    if (size > MAX_VIDEO_MB * 1024 * 1024) {
      console.warn(
        `⚠ El video pesa ${mb(size)}: se descargará en cada apertura. Conviene comprimirlo (HandBrake) a menos de ~10 MB.`
      );
    }
    uploads.push({ name: "hero.mp4", body: await readFile(videoSrc), contentType: "video/mp4", from: "video.mp4" });
  } else {
    const other = await findFile(SRC, "video", [".mov", ".webm", ".m4v", ".avi"]);
    if (other) {
      console.error(
        `Encontré ${path.basename(other)}, pero hace falta un MP4 (H.264) para que funcione en iPhone y Android. Conviértelo con HandBrake o CloudConvert y guárdalo como video.mp4.`
      );
      process.exit(1);
    }
    console.warn("⚠ No hay video.mp4: solo se subirán las fotos.");
  }

  if (uploads.length === 0) {
    console.error("No hay nada que subir.");
    process.exit(1);
  }

  console.log(dryRun ? "\nDry run (no se sube nada):" : "\nSe subirá:");
  for (const u of uploads) console.log(`  ${u.name.padEnd(14)} ${kb(u.body.length).padStart(9)}   ← ${u.from}`);
  for (const s of skipped) console.warn(`  ⚠ omitida: ${s}`);

  const photoCount = uploads.filter((u) => /^photo-\d+\.webp$/.test(u.name)).length;
  if (dryRun) {
    console.log(`\n${photoCount} fotos listas.`);
    return;
  }

  // ---- subida ----
  const env = await loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: buckets, error: listError } = await sb.storage.listBuckets();
  if (listError) throw listError;
  if (!buckets.some((b) => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    console.log(`\nBucket "${BUCKET}" creado (público).`);
  }

  for (const u of uploads) {
    const { error } = await sb.storage.from(BUCKET).upload(u.name, u.body, {
      contentType: u.contentType,
      upsert: true,
      cacheControl: CACHE,
    });
    if (error) {
      console.error(`✗ ${u.name}: ${error.message}`);
      process.exit(1);
    }
    console.log(`✓ ${u.name}`);
  }

  console.log(`\nListo. Ahora en src/lib/invitation-sample.ts pon:`);
  console.log(`  INVITATION_MEDIA = { enabled: true, photoCount: ${photoCount}, version: <súbelo si reemplazas archivos> }`);
  console.log(`Ejemplo de URL: ${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/photo-1.webp`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
