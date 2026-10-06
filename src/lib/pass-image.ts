// Genera una imagen PNG (1080×1800) del pase (QR + datos + ubicación) con Canvas 2D,
// para que el invitado la guarde en su teléfono.

export interface PassImageData {
  coupleName: string;
  eventDate: string;
  groupName: string;
  qrDataUrl: string;
  code: string;
  guestCount: number;
  tableNumber: number;
  eventTime: string;
  dressCode: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
}

const W = 1080;
const H = 1800;
const INK = "#0a2540";
const GOLD = "#c8a054";
const GOLD_DEEP = "#a8843a";
const MUTED = "#64748b";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Parte `text` en líneas que quepan en `maxWidth` con la fuente actual del contexto */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Dibuja texto con salto de línea y devuelve la `y` siguiente */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3
): number {
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing no existe en navegadores antiguos; se ignora sin romper
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

export async function renderPassImage(data: PassImageData): Promise<Blob> {
  const rootStyle = getComputedStyle(document.documentElement);
  const serif = rootStyle.getPropertyValue("--font-playfair").trim() || "Georgia, serif";
  const sans = rootStyle.getPropertyValue("--font-plus-jakarta").trim() || "system-ui, sans-serif";

  const fonts = {
    eyebrow: `600 24px ${sans}`,
    title: `400 76px ${serif}`,
    italic: `italic 400 40px ${serif}`,
    body: `400 28px ${sans}`,
    bold: `700 30px ${sans}`,
    value: `400 38px ${serif}`,
    venue: `400 40px ${serif}`,
    mono: `400 26px ui-monospace, SFMono-Regular, Menlo, monospace`,
  };
  await Promise.all(Object.values(fonts).map((f) => document.fonts.load(f).catch(() => [])));

  const QRCode = (await import("qrcode")).default;
  const [qrImg, mapsImg] = await Promise.all([
    loadImage(data.qrDataUrl),
    data.venueName
      ? QRCode.toDataURL(data.mapsUrl, {
          width: 240,
          margin: 0,
          color: { dark: INK, light: "#ffffff" },
        }).then(loadImage)
      : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  // Papel y marco dorado doble
  const paper = ctx.createLinearGradient(0, 0, 0, H);
  paper.addColorStop(0, "#fdfaf3");
  paper.addColorStop(1, "#f6eedc");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.strokeRect(50, 50, W - 100, H - 100);
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const cx = W / 2;
  const contentW = W - 200;

  // Encabezado
  ctx.font = fonts.eyebrow;
  ctx.fillStyle = GOLD_DEEP;
  setSpacing(ctx, 8);
  ctx.fillText("SE COMPLACEN EN INVITARTE", cx, 150);
  setSpacing(ctx, 0);

  ctx.font = fonts.title;
  ctx.fillStyle = INK;
  let y = drawWrapped(ctx, data.coupleName, cx, 250, contentW, 84, 2);

  ctx.font = fonts.body;
  ctx.fillStyle = MUTED;
  y = drawWrapped(ctx, data.eventDate, cx, y + 6, contentW, 38, 2);

  ctx.font = fonts.italic;
  ctx.fillStyle = INK;
  ctx.fillText(`Para ${data.groupName}`, cx, y + 56, contentW);
  y += 100;

  // QR de acceso en marco blanco
  const qrBox = 480;
  const qrX = cx - qrBox / 2;
  ctx.save();
  ctx.shadowColor = "rgba(10, 37, 64, 0.18)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrX, y, qrBox, qrBox, 16);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(qrX, y, qrBox, qrBox, 16);
  ctx.stroke();
  ctx.drawImage(qrImg, qrX + 40, y + 40, qrBox - 80, qrBox - 80);
  y += qrBox + 52;

  ctx.font = fonts.mono;
  ctx.fillStyle = MUTED;
  ctx.fillText(`Código · ${data.code}`, cx, y);
  ctx.font = fonts.bold;
  ctx.fillStyle = GOLD_DEEP;
  ctx.fillText(`Válido para ${data.guestCount} personas`, cx, y + 46);
  y += 120;

  // Mesa / Hora / Vestimenta
  const cols = [
    { label: "MESA", value: `Mesa ${data.tableNumber}` },
    { label: "HORA", value: data.eventTime },
    { label: "VESTIMENTA", value: data.dressCode },
  ];
  const colW = contentW / cols.length;
  cols.forEach((col, i) => {
    const x = 100 + colW * i + colW / 2;
    ctx.font = fonts.eyebrow;
    ctx.fillStyle = MUTED;
    setSpacing(ctx, 4);
    ctx.fillText(col.label, x, y);
    setSpacing(ctx, 0);
    ctx.font = fonts.value;
    ctx.fillStyle = INK;
    ctx.fillText(col.value, x, y + 52, colW - 20);
    if (i > 0) {
      ctx.strokeStyle = "rgba(200, 160, 84, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100 + colW * i, y - 28);
      ctx.lineTo(100 + colW * i, y + 64);
      ctx.stroke();
    }
  });
  y += 110;

  // Ubicación: texto a la izquierda y QR a Google Maps a la derecha
  if (data.venueName && mapsImg) {
    ctx.strokeStyle = "rgba(200, 160, 84, 0.5)";
    ctx.beginPath();
    ctx.moveTo(100, y);
    ctx.lineTo(W - 100, y);
    ctx.stroke();
    y += 60;

    const mapsSize = 200;
    const mapsX = W - 100 - mapsSize;
    const textW = mapsX - 140;

    ctx.textAlign = "left";
    ctx.font = fonts.eyebrow;
    ctx.fillStyle = GOLD_DEEP;
    setSpacing(ctx, 6);
    ctx.fillText("UBICACIÓN", 100, y);
    setSpacing(ctx, 0);
    ctx.font = fonts.venue;
    ctx.fillStyle = INK;
    const nameEnd = drawWrapped(ctx, data.venueName, 100, y + 56, textW, 46, 2);
    if (data.venueAddress) {
      ctx.font = fonts.body;
      ctx.fillStyle = MUTED;
      drawWrapped(ctx, data.venueAddress, 100, nameEnd + 6, textW, 36, 3);
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(mapsX - 12, y - 24, mapsSize + 24, mapsSize + 24);
    ctx.drawImage(mapsImg, mapsX, y - 12, mapsSize, mapsSize);
    ctx.textAlign = "center";
    ctx.font = `600 20px ${sans}`;
    ctx.fillStyle = MUTED;
    ctx.fillText("Escanea para cómo llegar", mapsX + mapsSize / 2, y + mapsSize + 36);
  }

  ctx.textAlign = "center";
  ctx.font = `400 22px ${sans}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("Presenta este código QR en la entrada · Attendapp", cx, H - 90);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob falló"))), "image/png")
  );
}
