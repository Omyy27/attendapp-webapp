import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const INK = "#0a2540";
const GOLD = "#c8a054";

function iconSvg(size, padding) {
  // Corazón dorado sobre fondo ink, con padding para variante maskable
  const heart = `
    <g transform="translate(${size / 2}, ${size / 2}) scale(${(size - padding * 2) / 24}) translate(-12, -12)">
      <path fill="${GOLD}" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${INK}"/>
    ${heart}
  </svg>`;
}

async function generate() {
  await mkdir("public", { recursive: true });

  await sharp(Buffer.from(iconSvg(192, 24))).png().toFile("public/icon-192.png");
  await sharp(Buffer.from(iconSvg(512, 64))).png().toFile("public/icon-512.png");
  // Maskable: más padding, sin bordes redondeados (el SO aplica la máscara)
  const maskable = iconSvg(512, 64).replace(`rx="${512 * 0.22}"`, 'rx="0"');
  await sharp(Buffer.from(maskable)).png().toFile("public/icon-maskable-512.png");
  // Apple touch icon (180x180)
  await sharp(Buffer.from(iconSvg(180, 22))).png().toFile("public/apple-touch-icon.png");

  console.log("Iconos generados: icon-192, icon-512, icon-maskable-512, apple-touch-icon");
}

generate();
