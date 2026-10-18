// Genera una imagen PNG del pase (QR + datos + colores a evitar + ubicación) con
// Canvas 2D, para que el invitado la guarde en su teléfono. El alto depende del
// contenido: se mide en una primera pasada y se dibuja en la segunda.

export interface PassColor {
  name: string;
  /** 1–3 tonos; si hay varios la muestra se divide en franjas */
  hexes: string[];
}

export interface PassColorGroup {
  group: string;
  colors: PassColor[];
}

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
  /** Ceremonia (opcional); venueName/eventTime son los de la recepción */
  ceremony?: {
    name: string;
    address: string;
    date: string;
    time: string;
    mapsUrl: string;
  } | null;
  /** Colores que los invitados deben evitar, por grupo (mujeres / hombres) */
  avoid: PassColorGroup[];
  avoidNote: string;
  /** Aviso de celebración solo para adultos */
  adultsOnly: string;
}

const W = 1080;
// Alto del lienzo de medición; el alto final del PNG depende del contenido
const MAX_H = 4000;
const FOOTER_SPACE = 160;
const INK = "#3b4228";
const GOLD = "#f591b3";
const GOLD_DEEP = "#b84a72";
const MUTED = "#64748b";
const WARN = "#be123c";

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

/**
 * Rejilla de muestras tachadas centrada en `cx`, con `perRow` por fila (la última
 * fila se centra sola). Devuelve la `y` siguiente.
 */
function drawAvoidSwatches(
  ctx: CanvasRenderingContext2D,
  colors: PassColor[],
  cx: number,
  y: number,
  perRow: number,
  font: string
): number {
  const r = 30;
  const gap = 164;
  const rowH = 150;
  for (let start = 0; start < colors.length; start += perRow) {
    const row = colors.slice(start, start + perRow);
    const rowY = y + (start / perRow) * rowH;
    const startX = cx - ((row.length - 1) * gap) / 2;
    row.forEach((color, i) => {
      const x = startX + i * gap;

      // Muestra: círculo recortado con una franja por tono
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, rowY, r, 0, Math.PI * 2);
      ctx.clip();
      const stripe = (r * 2) / color.hexes.length;
      color.hexes.forEach((hex, k) => {
        ctx.fillStyle = hex;
        ctx.fillRect(x - r + k * stripe, rowY - r, stripe + 0.5, r * 2);
      });
      ctx.restore();
      ctx.beginPath();
      ctx.arc(x, rowY, r, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Línea roja de "evitar"
      ctx.strokeStyle = WARN;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, rowY + r * 0.7);
      ctx.lineTo(x + r * 0.7, rowY - r * 0.7);
      ctx.stroke();

      ctx.font = font;
      ctx.fillStyle = MUTED;
      drawWrapped(ctx, color.name, x, rowY + r + 30, gap - 14, 24, 2);
    });
  }
  return y + Math.ceil(colors.length / perRow) * rowH;
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
    swatch: `500 20px ${sans}`,
  };
  await Promise.all(Object.values(fonts).map((f) => document.fonts.load(f).catch(() => [])));

  const QRCode = (await import("qrcode")).default;
  const mapsQr = (url: string) =>
    QRCode.toDataURL(url, {
      width: 240,
      margin: 0,
      color: { dark: INK, light: "#ffffff" },
    }).then(loadImage);
  const [qrImg, mapsImg, ceremonyImg] = await Promise.all([
    loadImage(data.qrDataUrl),
    data.venueName ? mapsQr(data.mapsUrl) : Promise.resolve(null),
    data.ceremony ? mapsQr(data.ceremony.mapsUrl) : Promise.resolve(null),
  ]);

  // Dibuja el pase en `ctx` con alto `H` y devuelve la `y` donde termina el contenido
  const draw = (ctx: CanvasRenderingContext2D, H: number): number => {
    // Papel y marco dorado doble
    const paper = ctx.createLinearGradient(0, 0, 0, H);
    paper.addColorStop(0, "#fffdf7");
    paper.addColorStop(1, "#f6f0e0");
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
    ctx.shadowColor = "rgba(59, 66, 40, 0.18)";
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

    // Mesa / horas / Vestimenta (con ceremonia: las dos horas por separado)
    const cols = data.ceremony
      ? [
          { label: "MESA", value: `Mesa ${data.tableNumber}` },
          { label: "CEREMONIA", value: data.ceremony.time || "—" },
          { label: "RECEPCIÓN", value: data.eventTime },
          { label: "VESTIMENTA", value: data.dressCode },
        ]
      : [
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
        ctx.strokeStyle = "rgba(245, 145, 179, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100 + colW * i, y - 28);
        ctx.lineTo(100 + colW * i, y + 64);
        ctx.stroke();
      }
    });
    y += 110;

    const divider = () => {
      ctx.strokeStyle = "rgba(245, 145, 179, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, y);
      ctx.lineTo(W - 100, y);
      ctx.stroke();
    };

    // Colores a evitar, por grupo
    if (data.avoid.length > 0) {
      divider();
      ctx.font = fonts.eyebrow;
      ctx.fillStyle = WARN;
      setSpacing(ctx, 4);
      ctx.fillText("COLORES A EVITAR", cx, y + 60);
      setSpacing(ctx, 0);
      ctx.font = fonts.body;
      ctx.fillStyle = MUTED;
      ctx.fillText(data.avoidNote, cx, y + 102, contentW);
      y += 170;

      for (const group of data.avoid) {
        ctx.font = fonts.eyebrow;
        ctx.fillStyle = GOLD_DEEP;
        setSpacing(ctx, 4);
        ctx.fillText(group.group.toUpperCase(), cx, y);
        setSpacing(ctx, 0);
        y = drawAvoidSwatches(ctx, group.colors, cx, y + 56, 5, fonts.swatch) + 30;
      }
      y += 20;
    }

    // Solo adultos
    if (data.adultsOnly) {
      divider();
      ctx.font = fonts.eyebrow;
      ctx.fillStyle = GOLD_DEEP;
      setSpacing(ctx, 4);
      ctx.fillText("CELEBRACIÓN SOLO PARA ADULTOS", cx, y + 56);
      setSpacing(ctx, 0);
      ctx.font = fonts.body;
      ctx.fillStyle = MUTED;
      y = drawWrapped(ctx, data.adultsOnly, cx, y + 102, contentW, 38, 3) + 4;
    }

    // Lugares: texto a la izquierda y QR a Google Maps a la derecha
    const drawPlace = (
      label: string,
      name: string,
      address: string,
      meta: string,
      qr: HTMLImageElement
    ) => {
      divider();
      y += 60;

      const mapsSize = 200;
      const mapsX = W - 100 - mapsSize;
      const textW = mapsX - 140;

      ctx.textAlign = "left";
      ctx.font = fonts.eyebrow;
      ctx.fillStyle = GOLD_DEEP;
      setSpacing(ctx, 6);
      ctx.fillText(label, 100, y);
      setSpacing(ctx, 0);

      let textY = y + 56;
      if (meta) {
        ctx.font = `500 24px ${sans}`;
        ctx.fillStyle = GOLD_DEEP;
        textY = drawWrapped(ctx, meta, 100, y + 44, textW, 30, 2) + 22;
      }
      ctx.font = fonts.venue;
      ctx.fillStyle = INK;
      const nameEnd = drawWrapped(ctx, name, 100, textY, textW, 46, 2);
      if (address) {
        ctx.font = fonts.body;
        ctx.fillStyle = MUTED;
        drawWrapped(ctx, address, 100, nameEnd + 6, textW, 36, 3);
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mapsX - 12, y - 24, mapsSize + 24, mapsSize + 24);
      ctx.drawImage(qr, mapsX, y - 12, mapsSize, mapsSize);
      ctx.textAlign = "center";
      ctx.font = `600 20px ${sans}`;
      ctx.fillStyle = MUTED;
      ctx.fillText("Escanea para cómo llegar", mapsX + mapsSize / 2, y + mapsSize + 36);
      // El bloque termina bajo el QR de Maps
      y += mapsSize + 60;
    };

    const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

    if (data.ceremony && ceremonyImg) {
      drawPlace(
        "CEREMONIA",
        data.ceremony.name,
        data.ceremony.address,
        [capitalize(data.ceremony.date), data.ceremony.time].filter(Boolean).join(" · "),
        ceremonyImg
      );
    }
    if (data.venueName && mapsImg) {
      drawPlace(
        data.ceremony ? "RECEPCIÓN" : "UBICACIÓN",
        data.venueName,
        data.venueAddress,
        data.ceremony ? ["Después de la ceremonia", data.eventTime].filter(Boolean).join(" · ") : "",
        mapsImg
      );
    }

    ctx.textAlign = "center";
    ctx.font = `400 22px ${sans}`;
    ctx.fillStyle = MUTED;
    ctx.fillText("Presenta este código QR en la entrada · Attendapp", cx, H - 90);

    return y;
  };

  // 1ª pasada: medir cuánto ocupa el contenido. 2ª: dibujar con el alto exacto.
  const measure = document.createElement("canvas");
  measure.width = W;
  measure.height = MAX_H;
  const measureCtx = measure.getContext("2d");
  if (!measureCtx) throw new Error("Canvas no disponible");
  const endY = draw(measureCtx, MAX_H);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = Math.min(MAX_H, Math.ceil(endY + FOOTER_SPACE));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");
  draw(ctx, canvas.height);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob falló"))), "image/png")
  );
}
