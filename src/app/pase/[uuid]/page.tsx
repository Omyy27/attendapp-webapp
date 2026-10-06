"use client";

import { use, useState, useEffect, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { EnvelopeIntro, openingDurationMs } from "@/components/envelope-intro";
import { HeroVideo } from "@/components/invitation/hero-video";
import { PhotoCarousel } from "@/components/invitation/photo-carousel";
import {
  SAMPLE_GALLERY,
  SAMPLE_HERO_VIDEO,
  SAMPLE_INVITATION_TEXT,
  SAMPLE_PREVIEW_LINES,
} from "@/lib/invitation-sample";
import { renderPassImage } from "@/lib/pass-image";

const VenueMap = dynamic(() => import("@/components/venue-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 bg-slate-100 animate-pulse" />
  ),
});

interface PassData {
  group_name: string;
  table_number: number;
  guest_count: number;
  confirmed_count: number;
  event_time: string;
  dress_code: string;
  venue_name: string;
  venue_address: string;
  venue_lat: number;
  venue_lng: number;
  couple_name: string;
  event_date: string;
}

export default function GuestPassPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = use(params);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [passData, setPassData] = useState<PassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [rsvpState, setRsvpState] = useState<"idle" | "loading" | "confirmed">("idle");
  const [phase, setPhase] = useState<"closed" | "opening" | "open">("closed");
  const [openError, setOpenError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [copied, setCopied] = useState(false);

  // La invitación siempre se ve en modo claro, sin importar el tema del usuario
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("force-light");
    el.style.colorScheme = "light";
    return () => {
      el.classList.remove("force-light");
      el.style.colorScheme = "";
    };
  }, []);

  useEffect(() => {
    async function loadPass() {
      try {
        // Fetch pass data from API
        const res = await fetch(`/api/pass/${uuid}`);
        if (!res.ok) throw new Error("Invitación no encontrada");
        const data: PassData = await res.json();
        setPassData(data);

        // Si todos los invitados del grupo ya confirmaron, mostrar carta abierta directo
        if (data.confirmed_count >= data.guest_count && data.guest_count > 0) {
          setRsvpState("confirmed");
          setPhase("open");
        }
      } catch {
        setError("Invitación no encontrada o expirada");
      } finally {
        setLoading(false);
      }
    }
    loadPass();
  }, [uuid]);

  // Bloquear scroll mientras el sobre está visible
  useEffect(() => {
    if (loading || error || phase === "open") {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase, loading, error]);

  // El QR se genera solo cuando la asistencia está confirmada
  useEffect(() => {
    if (rsvpState !== "confirmed") return;
    let cancelled = false;

    async function generateQr() {
      const QRCode = (await import("qrcode")).default;
      const qrUrl = await QRCode.toDataURL(`ATTENDAPP-${uuid.toUpperCase()}`, {
        width: 400,
        margin: 0,
        color: { dark: "#0a2540", light: "#ffffff" },
      });
      if (!cancelled) setQrDataUrl(qrUrl);
    }

    generateQr();
    return () => { cancelled = true; };
  }, [rsvpState, uuid]);

  async function handleRsvp(): Promise<boolean> {
    setRsvpState("loading");
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid }),
      });
      const data = await res.json();
      if (data.result === "confirmed" || data.result === "already_confirmed") {
        setRsvpState("confirmed");
        if (passData) {
          setPassData({ ...passData, confirmed_count: passData.guest_count });
        }
        return true;
      }
      setRsvpState("idle");
      return false;
    } catch {
      setRsvpState("idle");
      return false;
    }
  }

  function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function handleOpen() {
    if (phase !== "closed") return;
    setPhase("opening");
    setOpenError(null);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Duración mínima de la apertura + previa (tiempos en envelope-intro.tsx)
    const minDuration = reduced ? 150 : openingDurationMs(SAMPLE_PREVIEW_LINES.length);

    const [ok] = await Promise.all([handleRsvp(), wait(minDuration)]);
    if (ok) {
      setPhase("open");
    } else {
      setPhase("closed");
      setOpenError("No se pudo confirmar tu asistencia. Intenta de nuevo.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen letter-desk flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Cargando pase...</div>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div className="min-h-screen letter-desk flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
          <h1 className="font-serif text-xl text-ink mb-2">Invitación no válida</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const isOpen = phase === "open";
  const code = uuid.toUpperCase();
  const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
  const mapsUrl =
    passData.venue_lat && passData.venue_lng
      ? `https://www.google.com/maps/search/?api=1&query=${passData.venue_lat},${passData.venue_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${passData.venue_name || ""} ${passData.venue_address || ""}`
        )}`;

  async function handleSave() {
    if (!passData || !qrDataUrl || saveState === "saving") return;
    setSaveState("saving");
    try {
      const blob = await renderPassImage({
        coupleName: passData.couple_name,
        eventDate: passData.event_date,
        groupName: passData.group_name,
        qrDataUrl,
        code: formattedCode,
        guestCount: passData.guest_count,
        tableNumber: passData.table_number,
        eventTime: passData.event_time || "17:00 hrs",
        dressCode: passData.dress_code || "Formal / Gala",
        venueName: passData.venue_name,
        venueAddress: passData.venue_address,
        mapsUrl,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pase-${slugify(passData.couple_name)}-${slugify(passData.group_name)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaveState("idle");
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  async function handleShare() {
    const link = window.location.href;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Contexto no seguro o navegador antiguo: copia con un textarea temporal
      const textarea = document.createElement("textarea");
      textarea.value = link;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const details = [
    {
      label: "Mesa",
      value: `Mesa ${passData.table_number}`,
      icon: <path d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 2v-4h-2V8c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v2H6v4h2v2h8v-2h2z" />,
    },
    {
      label: "Cupo",
      value: `${passData.guest_count} invitados`,
      icon: (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
    },
    {
      label: "Hora",
      value: passData.event_time || "17:00 hrs",
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </>
      ),
    },
    {
      label: "Vestimenta",
      value: passData.dress_code || "Formal / Gala",
      icon: (
        <>
          <path d="M20.38 3.46 16 2 12 3.46 8 2 3.62 3.46a2 2 0 0 0-1.34 1.89v13.3a2 2 0 0 0 2.66 1.89L8 19l4-1.46L16 19l4.38-1.46a2 2 0 0 0 1.34-1.89V5.35a2 2 0 0 0-1.34-1.89z" />
          <line x1="12" y1="2" x2="12" y2="17.54" />
        </>
      ),
    },
  ];

  return (
    <>
      {!isOpen && (
        <EnvelopeIntro
          coupleName={passData.couple_name}
          eventDate={passData.event_date}
          previewLines={SAMPLE_PREVIEW_LINES}
          opening={phase === "opening"}
          error={openError}
          onOpen={handleOpen}
        />
      )}

      <main
        className={`letter-desk min-h-dvh ${isOpen ? "letter-open" : "pointer-events-none"}`}
        aria-hidden={!isOpen}
      >
        {/* 1. Video de los novios */}
        <HeroVideo
          src={SAMPLE_HERO_VIDEO.src}
          poster={SAMPLE_HERO_VIDEO.poster}
          coupleName={passData.couple_name}
          eventDate={passData.event_date}
          active={phase !== "closed"}
          scrollTargetId="carta"
        />

        <div id="carta" className="md:px-6 md:py-12">
          <article
            className="letter-paper paper-texture relative mx-auto min-h-dvh max-w-lg overflow-hidden md:min-h-0 md:rounded-md md:shadow-[0_30px_70px_-25px_rgba(60,40,10,0.55)]"
          >
            <div className="relative px-8 pb-14 pt-16 md:px-12">
              <span className="letter-frame" aria-hidden="true" />
              <CornerOrnament className="left-5 top-5" />
              <CornerOrnament className="right-5 top-5 -scale-x-100" />
              <CornerOrnament className="bottom-5 left-5 -scale-y-100" />
              <CornerOrnament className="bottom-5 right-5 -scale-100" />

              {/* 2. Texto de invitación */}
              <section className="letter-reveal text-center" style={delay(0.25)}>
                <p className="text-[10px] uppercase tracking-[0.35em] text-gold-deep font-semibold">
                  Se complacen en invitarte
                </p>
                <p className="font-serif italic text-xl text-ink mt-4">
                  Para {passData.group_name}
                </p>
                {SAMPLE_INVITATION_TEXT.map((paragraph) => (
                  <p key={paragraph} className="text-sm text-slate-600 leading-relaxed mt-3">
                    {paragraph}
                  </p>
                ))}
                <span className="ornament-divider mt-8" />
              </section>

              {/* 3. Información de la boda */}
              <section className="letter-reveal mt-10" style={delay(0.35)}>
                <SectionTitle eyebrow="La celebración" title="Información de la boda" />
                <p className="text-center text-xs text-slate-500 tracking-wider -mt-2 mb-4">
                  {passData.event_date}
                </p>
                <div className="grid grid-cols-2">
                  {details.map((item, i) => (
                    <div
                      key={item.label}
                      className={`px-2 py-4 text-center border-gold/30 ${i < 2 ? "border-b" : ""} ${
                        i % 2 === 0 ? "border-r" : ""
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gold-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          {item.icon}
                        </svg>
                        {item.label}
                      </p>
                      <p className="font-serif text-lg text-ink mt-1.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4. Tu pase */}
              <section className="letter-reveal mt-12 flex flex-col items-center" style={delay(0.45)}>
                <SectionTitle eyebrow="Tu acceso" title="Tu pase" />
                <div className="qr-stamp">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="Código QR de acceso"
                      className="w-52 h-52 object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 animate-pulse rounded bg-slate-100" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-5 tracking-wider">
                  Código · {formattedCode}
                </p>
                <p className="mt-2 text-xs font-semibold text-gold-deep">
                  Válido para {passData.guest_count} personas
                </p>
                <p className="mt-4 text-center text-xs text-emerald-700">
                  ¡Asistencia confirmada! Presenta este código en la entrada.
                </p>
              </section>

              {/* 5. Galería */}
              <section className="letter-reveal mt-12 -mx-8 md:-mx-12" style={delay(0.55)}>
                <SectionTitle eyebrow="Nuestra historia" title="Galería" />
                <PhotoCarousel photos={SAMPLE_GALLERY} />
              </section>

              {/* 6. Ubicación */}
              {passData.venue_name && (
                <section className="letter-reveal mt-12" style={delay(0.65)}>
                  <SectionTitle eyebrow="¿Dónde?" title="Ubicación" />
                  <div className="photo-frame">
                    {passData.venue_lat && passData.venue_lng ? (
                      <VenueMap
                        lat={passData.venue_lat}
                        lng={passData.venue_lng}
                        name={passData.venue_name}
                        height={180}
                      />
                    ) : (
                      <div className="w-full h-[180px] bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
                        <span className="w-10 h-10 rounded-full bg-ink flex items-center justify-center shadow-lg">
                          <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                          </svg>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 text-center">
                    <h3 className="font-serif text-lg text-ink">{passData.venue_name}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {passData.venue_address}
                    </p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-ink-light"
                    >
                      <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polygon points="3 11 22 2 13 21 11 13 3 11" />
                      </svg>
                      Cómo llegar
                    </a>
                  </div>
                </section>
              )}

              {/* 7. Acciones y firma */}
              <section className="letter-reveal mt-8" style={delay(0.8)}>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!qrDataUrl || saveState === "saving"}
                    className="flex-1 rounded-full border border-gold/40 bg-white/60 py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-ink transition-colors hover:bg-white disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 text-gold-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {saveState === "saving" ? "Generando…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 rounded-full border border-gold/40 bg-white/60 py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-ink transition-colors hover:bg-white"
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gold-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    )}
                    {copied ? "¡Enlace copiado!" : "Compartir"}
                  </button>
                </div>
                <p className="mt-2 min-h-4 text-center text-xs" aria-live="polite">
                  {saveState === "error" ? (
                    <span className="text-rose-600">No se pudo generar la imagen. Intenta de nuevo.</span>
                  ) : copied ? (
                    <span className="text-emerald-700">Enlace de la invitación copiado al portapapeles</span>
                  ) : null}
                </p>
              </section>

              {/* Firma */}
              <footer className="letter-reveal mt-12 text-center" style={delay(0.9)}>
                <p className="text-sm text-slate-500">Con cariño,</p>
                <p className="font-serif italic text-2xl text-ink mt-1">{passData.couple_name}</p>
                <p className="text-[10px] text-slate-400 mt-8 tracking-wide">Protegido por Attendapp</p>
              </footer>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}

function delay(seconds: number): CSSProperties {
  return { "--d": `${seconds}s` } as CSSProperties;
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-5 text-center">
      <p className="text-[10px] uppercase tracking-[0.35em] text-gold-deep font-semibold">{eyebrow}</p>
      <h2 className="font-serif text-2xl text-ink mt-1.5">{title}</h2>
    </header>
  );
}

function CornerOrnament({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute w-10 h-10 text-gold/70 ${className}`}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M2 46V14C2 7.4 7.4 2 14 2h32" />
      <path d="M8 46V20c0-6.6 5.4-12 12-12h26" />
      <circle cx="14" cy="14" r="2.5" fill="currentColor" />
    </svg>
  );
}
