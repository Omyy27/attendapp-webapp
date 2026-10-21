"use client";

import { use, useState, useEffect, useCallback, useRef, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { EnvelopeIntro, openingDurationMs } from "@/components/envelope-intro";
import { HeroVideo } from "@/components/invitation/hero-video";
import { MusicPlayer, type MusicPlayerHandle } from "@/components/invitation/music-player";
import { PhotoCarousel } from "@/components/invitation/photo-carousel";
import { CoupleName } from "@/components/invitation/couple-name";
import { coupleFirstNames } from "@/lib/event-format";
import {
  INVITATION_MUSIC,
  SAMPLE_ADULTS_ONLY,
  SAMPLE_DRESS_CODE,
  SAMPLE_GALLERY,
  SAMPLE_GIFT_COPY,
  SAMPLE_HERO_VIDEO,
  SAMPLE_INVITATION_TEXT,
  SAMPLE_MUSIC_SRC,
  SAMPLE_PREVIEW_LINES,
  SAMPLE_QR_NOTICE,
  SAMPLE_REVEAL_COPY,
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
  /** El organizador configuró un lugar sorpresa que se revela al confirmar */
  reveal_enabled: boolean;
  /** El servidor ya entregó el lugar real (el grupo confirmó) */
  venue_revealed: boolean;
  reveal_message: string | null;
  /** El servidor decide si el grupo cuenta como confirmado (depende del modo) */
  confirmed?: boolean;
  /** in_app: el invitado confirma aquí. organizer: confirma con quien le envió la invitación */
  confirm_mode?: "in_app" | "organizer";
  /** Iniciales de la pareja para el sobre y la previa; null = nombre completo */
  couple_initials?: string | null;
  /** Sección de obsequios; null = oculta */
  gift_message?: string | null;
  /** Galería y chat de invitados en /pase/[uuid]/momentos */
  moments_enabled?: boolean;
  /** Ceremonia (opcional); venue_* y event_time son los de la recepción */
  ceremony?: {
    name: string;
    address: string;
    lat: number | null;
    lng: number | null;
    date: string;
    time: string;
  } | null;
}

function mapsLink(lat: number | null, lng: number | null, name: string, address: string) {
  return lat && lng
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name || ""} ${address || ""}`)}`;
}

const isConfirmed = (d: PassData) =>
  d.confirmed ?? (d.confirmed_count >= d.guest_count && d.guest_count > 0);

// Banderas por dispositivo (localStorage puede no estar disponible: se ignoran los errores)
const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};
const writeFlag = (key: string) => {
  try {
    localStorage.setItem(key, "1");
  } catch {}
};
const REFRESH_MS = 20000;

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
  const [confirmError, setConfirmError] = useState<string | null>(null);
  // La revelación del lugar se muestra una sola vez por dispositivo
  const [revealSeen, setRevealSeen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const musicRef = useRef<MusicPlayerHandle>(null);
  // Pantalla de revelación del lugar: confirmado, lugar entregado y aún no vista
  const revealVisible =
    phase === "open" && rsvpState === "confirmed" && !!passData?.venue_revealed && !revealSeen;

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

  const fetchPass = useCallback(async (): Promise<PassData> => {
    const res = await fetch(`/api/pass/${uuid}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Invitación no encontrada");
    return res.json();
  }, [uuid]);

  useEffect(() => {
    async function loadPass() {
      try {
        const data = await fetchPass();
        setPassData(data);

        // Si el grupo ya confirmó, mostrar carta abierta directo. En modo "organizer"
        // el organizador pudo confirmar antes de que abra el link: se muestra el sobre
        // hasta que este dispositivo lo haya abierto (así queda registrado `opened`).
        if (isConfirmed(data)) {
          setRsvpState("confirmed");
          setRevealSeen(readFlag(`pase-reveal-seen-${uuid}`));
          if (data.confirm_mode !== "organizer" || readFlag(`pase-opened-${uuid}`)) {
            setPhase("open");
          }
        }
      } catch {
        setError("Invitación no encontrada o expirada");
      } finally {
        setLoading(false);
      }
    }
    loadPass();
  }, [fetchPass, uuid]);

  // Bloquear scroll mientras el sobre está visible
  useEffect(() => {
    if (loading || error || (phase === "open" && !revealVisible)) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase, loading, error, revealVisible]);

  // El QR se genera solo cuando la asistencia está confirmada
  useEffect(() => {
    if (rsvpState !== "confirmed") return;
    let cancelled = false;

    async function generateQr() {
      const QRCode = (await import("qrcode")).default;
      const qrUrl = await QRCode.toDataURL(`ATTENDAPP-${uuid.toUpperCase()}`, {
        width: 400,
        margin: 0,
        color: { dark: "#3b4228", light: "#ffffff" },
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
        if (passData?.reveal_enabled) {
          // El lugar real solo lo entrega el servidor una vez confirmado
          try {
            const fresh = await fetchPass();
            setPassData(fresh);
            setRevealSeen(false); // si hay lugar revelado, se muestra la pantalla de revelación
            return true;
          } catch {
            // Confirmó, pero no pudimos traer el lugar: se verá al recargar
          }
        }
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

  // Modo "organizer": consulta si el organizador ya confirmó este grupo
  const refreshPass = useCallback(async () => {
    try {
      const fresh = await fetchPass();
      setPassData(fresh);
      if (isConfirmed(fresh)) {
        setRevealSeen(!fresh.venue_revealed);
        setRsvpState("confirmed");
      }
    } catch {
      // sin conexión: se reintenta en el siguiente ciclo
    }
  }, [fetchPass]);

  async function handleManualRefresh() {
    setRefreshing(true);
    await refreshPass();
    setRefreshing(false);
  }

  const waitingForOrganizer =
    passData?.confirm_mode === "organizer" && rsvpState !== "confirmed" && phase === "open";

  useEffect(() => {
    if (!waitingForOrganizer) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refreshPass();
    };
    tick();
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [waitingForOrganizer, refreshPass]);

  async function handleConfirm() {
    if (rsvpState === "loading") return;
    setConfirmError(null);
    const ok = await handleRsvp();
    if (!ok) setConfirmError("No se pudo confirmar tu asistencia. Intenta de nuevo.");
  }

  function closeReveal(scrollToVenue: boolean) {
    writeFlag(`pase-reveal-seen-${uuid}`);
    setRevealSeen(true);
    if (scrollToVenue) {
      setTimeout(() => {
        document.getElementById("ubicacion")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }

  function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function handleOpen() {
    if (phase !== "closed") return;
    setPhase("opening");
    setOpenError(null);
    // El toque en el sello es el gesto que permite el audio; suena al abrir la carta
    musicRef.current?.unlock();
    // Registrar que abrió la carta (estado `opened`); no bloquea la animación
    fetch(`/api/pass/${uuid}/opened`, { method: "POST", keepalive: true }).catch(() => {});
    writeFlag(`pase-opened-${uuid}`);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Duración mínima de la apertura + previa (tiempos en envelope-intro.tsx)
    const minDuration = reduced ? 150 : openingDurationMs(SAMPLE_PREVIEW_LINES.length);

    // Con lugar sorpresa o confirmación por el organizador, abrir el sobre no confirma
    if (passData?.reveal_enabled || passData?.confirm_mode === "organizer") {
      await wait(minDuration);
      setPhase("open");
      return;
    }

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
          <h1 className="font-serif text-xl text-inv-olive-deep mb-2">Invitación no válida</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const isOpen = phase === "open";
  // Sobre, previa y firma: solo nombres de pila; con el video, el nombre completo
  const firstNames = coupleFirstNames(passData.couple_name) || passData.couple_name;
  const code = uuid.toUpperCase();
  const formattedCode = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
  const mapsUrl = mapsLink(passData.venue_lat, passData.venue_lng, passData.venue_name, passData.venue_address);
  const ceremony = passData.ceremony ?? null;
  const ceremonyMapsUrl = ceremony
    ? mapsLink(ceremony.lat, ceremony.lng, ceremony.name, ceremony.address)
    : "";

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
        ceremony: ceremony
          ? {
              name: ceremony.name,
              address: ceremony.address,
              date: ceremony.date,
              time: ceremony.time,
              mapsUrl: ceremonyMapsUrl,
            }
          : null,
        avoidNote: SAMPLE_DRESS_CODE.note,
        avoid: SAMPLE_DRESS_CODE.avoid,
        adultsOnly: SAMPLE_ADULTS_ONLY,
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

  const clockIcon = (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  );
  const dressIcon = (
    <>
      <path d="M20.38 3.46 16 2 12 3.46 8 2 3.62 3.46a2 2 0 0 0-1.34 1.89v13.3a2 2 0 0 0 2.66 1.89L8 19l4-1.46L16 19l4.38-1.46a2 2 0 0 0 1.34-1.89V5.35a2 2 0 0 0-1.34-1.89z" />
      <line x1="12" y1="2" x2="12" y2="17.54" />
    </>
  );

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
    // Con ceremonia se muestran las dos horas (la vestimenta ya tiene su propio bloque)
    ...(ceremony
      ? [
          { label: "Ceremonia", value: ceremony.time || "Por confirmar", icon: clockIcon },
          { label: "Recepción", value: passData.event_time || "17:00 hrs", icon: clockIcon },
        ]
      : [
          { label: "Hora", value: passData.event_time || "17:00 hrs", icon: clockIcon },
          { label: "Vestimenta", value: passData.dress_code || "Formal / Gala", icon: dressIcon },
        ]),
  ];

  return (
    <>
      {!isOpen && (
        <EnvelopeIntro
          coupleName={passData.couple_initials || firstNames}
          initials={!!passData.couple_initials}
          eventDate={passData.event_date}
          previewLines={SAMPLE_PREVIEW_LINES}
          opening={phase === "opening"}
          error={openError}
          onOpen={handleOpen}
        />
      )}

      {revealVisible && (
        <RevealOverlay
          message={passData.reveal_message || SAMPLE_REVEAL_COPY.defaultMessage}
          venueName={passData.venue_name}
          venueAddress={passData.venue_address}
          onSeeVenue={() => closeReveal(true)}
          onContinue={() => closeReveal(false)}
        />
      )}

      {SAMPLE_MUSIC_SRC && (
        <MusicPlayer
          ref={musicRef}
          src={SAMPLE_MUSIC_SRC}
          title={INVITATION_MUSIC.title}
          volume={INVITATION_MUSIC.volume}
          active={isOpen && !revealVisible}
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
          active={isOpen}
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
                <p className="text-[10px] uppercase tracking-[0.35em] text-inv-rose-deep font-semibold">
                  Se complacen en invitarte
                </p>
                <p className="font-serif italic text-xl text-inv-olive-deep mt-4">
                  Para {passData.group_name}
                </p>
                {SAMPLE_INVITATION_TEXT.map((paragraph) => (
                  <p key={paragraph} className="text-sm text-slate-600 leading-relaxed mt-3">
                    {paragraph}
                  </p>
                ))}
                <span className="ornament-divider mt-8" />
              </section>

              {/* Confirmar asistencia: con botón (lugar sorpresa) o con quien envió la invitación */}
              {(passData.reveal_enabled || passData.confirm_mode === "organizer") &&
                rsvpState !== "confirmed" && (
                <section id="confirmar" className="letter-reveal mt-10" style={delay(0.3)}>
                  <div className="rounded-md border border-inv-rose/50 bg-white/60 px-6 py-7 text-center shadow-lift">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-inv-rose-deep font-semibold">
                      {SAMPLE_REVEAL_COPY.confirmEyebrow}
                    </p>
                    <p className="font-serif text-xl text-inv-olive-deep mt-2">
                      {SAMPLE_REVEAL_COPY.confirmTitle}
                    </p>
                    {passData.confirm_mode === "organizer" ? (
                      <>
                        <p className="text-sm text-slate-600 leading-relaxed mt-2">
                          {SAMPLE_REVEAL_COPY.organizerText}
                          {passData.reveal_enabled ? ` ${SAMPLE_REVEAL_COPY.organizerRevealText}` : ""}
                        </p>
                        <button
                          type="button"
                          onClick={handleManualRefresh}
                          disabled={refreshing}
                          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-inv-rose/60 bg-white/70 px-6 py-2.5 text-sm font-semibold text-inv-olive-deep transition-colors hover:bg-white disabled:opacity-60"
                        >
                          <svg className={`w-4 h-4 text-inv-rose-deep ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 12a9 9 0 1 1-3-6.7" />
                            <polyline points="21 3 21 9 15 9" />
                          </svg>
                          {refreshing ? "Revisando…" : SAMPLE_REVEAL_COPY.refreshLabel}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600 leading-relaxed mt-2">
                          {SAMPLE_REVEAL_COPY.confirmText}
                        </p>
                        <button
                          type="button"
                          onClick={handleConfirm}
                          disabled={rsvpState === "loading"}
                          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-inv-olive px-7 py-3 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-inv-olive-deep disabled:opacity-60"
                        >
                          <svg className="w-4 h-4 text-inv-rose" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          {rsvpState === "loading" ? "Confirmando…" : "Confirmar asistencia"}
                        </button>
                        <p className="mt-3 min-h-4 text-xs text-rose-600" role="alert">
                          {confirmError}
                        </p>
                      </>
                    )}
                  </div>
                </section>
              )}

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
                      className={`px-2 py-4 text-center border-inv-rose/50 ${i < 2 ? "border-b" : ""} ${
                        i % 2 === 0 ? "border-r" : ""
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-inv-rose-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          {item.icon}
                        </svg>
                        {item.label}
                      </p>
                      <p className="font-serif text-lg text-inv-olive-deep mt-1.5">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Código de vestimenta y colores a evitar */}
                <div className="mt-8 border-t border-inv-rose/50 pt-7 text-center">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-inv-rose-deep font-semibold">
                    Código de vestimenta
                  </p>
                  <p className="font-serif text-xl text-inv-olive-deep mt-1.5">
                    {passData.dress_code || "Formal / Gala"}
                  </p>

                  <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-rose-700 font-semibold">
                    Colores a evitar
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">{SAMPLE_DRESS_CODE.note}</p>

                  {SAMPLE_DRESS_CODE.avoid.map((group) => (
                    <div key={group.group} className="mt-6">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-inv-rose-deep font-semibold">
                        {group.group}
                      </p>
                      <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-5">
                        {group.colors.map((color) => (
                          <ColorSwatch key={color.name} hexes={color.hexes} name={color.name} crossed />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Solo adultos */}
                <div className="mt-7 border-t border-inv-rose/50 pt-7 text-center">
                  <svg className="mx-auto h-6 w-6 text-inv-rose-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 22h8" />
                    <path d="M12 15v7" />
                    <path d="M7 3h10l-1 6a4 4 0 0 1-8 0z" />
                  </svg>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-inv-rose-deep font-semibold mt-2">
                    Celebración solo para adultos
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-2">{SAMPLE_ADULTS_ONLY}</p>
                </div>
              </section>

              {/* Obsequios (se configura en Ajustes) */}
              {passData.gift_message && (
                <section className="letter-reveal mt-12 text-center" style={delay(0.4)}>
                  <SectionTitle eyebrow={SAMPLE_GIFT_COPY.eyebrow} title={SAMPLE_GIFT_COPY.title} />
                  <svg className="mx-auto h-7 w-7 text-inv-rose-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="m22 7-10 6L2 7" />
                  </svg>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {passData.gift_message}
                  </p>
                </section>
              )}

              {/* 4. Tu pase */}
              {rsvpState === "confirmed" ? (
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
                <p className="mt-2 text-xs font-semibold text-inv-rose-deep">
                  Válido para {passData.guest_count} personas
                </p>
                <p className="mt-4 text-center text-xs text-emerald-700">
                  ¡Asistencia confirmada! Presenta este código en la entrada.
                </p>
                <div className="mt-5 flex items-start gap-3 rounded-md border border-inv-rose/50 bg-white/60 px-5 py-4 text-left">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-inv-rose-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="6" y="2" width="12" height="20" rx="2" />
                    <path d="M11 18h2" />
                  </svg>
                  <p className="text-xs leading-relaxed text-slate-600">{SAMPLE_QR_NOTICE}</p>
                </div>
              </section>
              ) : (
              <section className="letter-reveal mt-12 flex flex-col items-center" style={delay(0.45)}>
                <SectionTitle eyebrow="Tu acceso" title="Tu pase" />
                <div className="flex h-56 w-56 flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-inv-rose/60 bg-white/50 px-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-inv-rose/20">
                    <svg className="h-6 w-6 text-inv-rose-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600">
                    Confirma tu asistencia para desbloquear tu código QR de entrada
                  </p>
                </div>
              </section>
              )}

              {/* 5. Galería */}
              <section className="letter-reveal mt-12 -mx-8 md:-mx-12" style={delay(0.55)}>
                <SectionTitle eyebrow="Nuestra historia" title="Galería" />
                <PhotoCarousel photos={SAMPLE_GALLERY} />
                {/* Momentos: solo para quien ya confirmó */}
                {passData.moments_enabled && rsvpState === "confirmed" && (
                  <div className="mt-8 px-8 md:px-12 text-center">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Comparte las fotos que tomes durante el evento y déjanos un mensaje.
                    </p>
                    <Link
                      href={`/pase/${uuid}/momentos`}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-inv-olive px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-inv-olive-deep"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      Fotos y mensajes del evento
                    </Link>
                  </div>
                )}
              </section>

              {/* 6. Ubicación: ceremonia (opcional) y recepción */}
              {(passData.venue_name || ceremony) && (
                <section className="letter-reveal mt-12" style={delay(0.65)}>
                  <SectionTitle
                    eyebrow="¿Dónde?"
                    title={ceremony ? "Ceremonia y recepción" : "Ubicación"}
                  />

                  {ceremony && (
                    <div className="mb-10">
                      <PlaceHeading
                        label="Ceremonia"
                        details={[ceremony.date, ceremony.time]}
                      />
                      <VenuePlace
                        name={ceremony.name}
                        address={ceremony.address}
                        lat={ceremony.lat}
                        lng={ceremony.lng}
                        mapsUrl={ceremonyMapsUrl}
                      />
                    </div>
                  )}

                  {passData.venue_name && (
                    <div id="ubicacion" className="scroll-mt-6">
                      {ceremony && (
                        <PlaceHeading
                          label="Recepción"
                          details={["Después de la ceremonia", passData.event_time]}
                        />
                      )}
                      {passData.venue_revealed && (
                        <div className="mb-5 rounded-md border border-inv-rose/50 bg-inv-rose/10 px-4 py-3 text-center">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-inv-rose-deep font-semibold">
                            {SAMPLE_REVEAL_COPY.updatedBadge}
                          </p>
                          {(passData.reveal_message || SAMPLE_REVEAL_COPY.defaultMessage) && (
                            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                              {passData.reveal_message || SAMPLE_REVEAL_COPY.defaultMessage}
                            </p>
                          )}
                        </div>
                      )}
                      <VenuePlace
                        name={passData.venue_name}
                        address={passData.venue_address}
                        lat={passData.venue_lat}
                        lng={passData.venue_lng}
                        mapsUrl={mapsUrl}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* 7. Acciones y firma */}
              <section className="letter-reveal mt-8" style={delay(0.8)}>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!qrDataUrl || saveState === "saving"}
                    className="flex-1 rounded-full border border-inv-rose/50 bg-white/60 py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-inv-olive-deep transition-colors hover:bg-white disabled:opacity-60"
                  >
                    <svg className="w-4 h-4 text-inv-rose-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {saveState === "saving" ? "Generando…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 rounded-full border border-inv-rose/50 bg-white/60 py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold text-inv-olive-deep transition-colors hover:bg-white"
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-inv-rose-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
                <p className="font-script text-3xl text-inv-olive-deep mt-1">
                  <CoupleName name={firstNames} />
                </p>
                {/* <p className="text-[10px] text-slate-400 mt-8 tracking-wide">Protegido por Attendapp</p> */}
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

function RevealOverlay({
  message,
  venueName,
  venueAddress,
  onSeeVenue,
  onContinue,
}: {
  message: string;
  venueName: string;
  venueAddress: string;
  onSeeVenue: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reveal-title"
      className="reveal-overlay letter-open letter-paper paper-texture fixed inset-0 z-50 overflow-y-auto"
    >
      <span className="letter-frame" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-8 py-14 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sello-lacre.webp"
          alt=""
          draggable={false}
          className="letter-reveal h-20 w-20 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
          style={delay(0.1)}
        />
        <p className="letter-reveal mt-6 text-[11px] uppercase tracking-[0.4em] text-inv-rose-deep font-semibold" style={delay(0.3)}>
          {SAMPLE_REVEAL_COPY.eyebrow}
        </p>
        <h2 id="reveal-title" className="letter-reveal font-serif text-3xl text-inv-olive-deep mt-3" style={delay(0.5)}>
          {SAMPLE_REVEAL_COPY.title}
        </h2>
        <span className="ornament-divider letter-reveal mt-5" style={delay(0.6)} />
        <p className="letter-reveal text-sm text-slate-600 leading-relaxed mt-6" style={delay(0.8)}>
          {message}
        </p>
        <div className="letter-reveal mt-6" style={delay(1.3)}>
          <p className="font-serif text-2xl text-inv-olive-deep">{venueName}</p>
          {venueAddress && (
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{venueAddress}</p>
          )}
        </div>
        <div className="letter-reveal mt-9 flex w-full flex-col gap-3 sm:flex-row sm:justify-center" style={delay(1.7)}>
          <button
            type="button"
            onClick={onSeeVenue}
            className="rounded-full bg-inv-olive px-7 py-3 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-inv-olive-deep"
          >
            Ver ubicación
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-full border border-inv-rose/60 bg-white/60 px-7 py-3 text-sm font-semibold text-inv-olive-deep transition-colors hover:bg-white"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceHeading({ label, details }: { label: string; details: (string | undefined)[] }) {
  const line = details.filter(Boolean).join(" · ");
  return (
    <div className="mb-4 text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-inv-rose-deep font-semibold">{label}</p>
      {line && <p className="mt-1 text-xs text-slate-500 capitalize-first">{line}</p>}
    </div>
  );
}

function VenuePlace({
  name,
  address,
  lat,
  lng,
  mapsUrl,
}: {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string;
}) {
  return (
    <>
      <div className="photo-frame">
        {lat && lng ? (
          <VenueMap key={`${lat},${lng}`} lat={lat} lng={lng} name={name} height={180} />
        ) : (
          <div className="w-full h-[180px] bg-gradient-to-br from-slate-50 to-slate-200 flex items-center justify-center">
            <span className="w-10 h-10 rounded-full bg-inv-olive flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-inv-rose" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </span>
          </div>
        )}
      </div>
      <div className="mt-5 text-center">
        <h3 className="font-serif text-lg text-inv-olive-deep">{name}</h3>
        {address && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{address}</p>}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-inv-olive px-6 py-2.5 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-inv-olive-deep"
        >
          <svg className="w-4 h-4 text-inv-rose" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          Cómo llegar
        </a>
      </div>
    </>
  );
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function swatchBackground(hexes: string[]) {
  if (hexes.length === 1) return hexes[0];
  const stops = hexes.map((hex, i) => `${hex} ${(i * 100) / hexes.length}% ${((i + 1) * 100) / hexes.length}%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function ColorSwatch({ hexes, name, crossed = false }: { hexes: string[]; name: string; crossed?: boolean }) {
  return (
    <li className="flex flex-col items-center gap-1.5">
      <span
        className={`swatch ${crossed ? "swatch-crossed" : ""}`}
        style={{ background: swatchBackground(hexes) }}
        aria-hidden="true"
      />
      <span className="text-[11px] leading-tight text-slate-600">{name}</span>
    </li>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="mb-5 text-center">
      <p className="text-[10px] uppercase tracking-[0.35em] text-inv-rose-deep font-semibold">{eyebrow}</p>
      <h2 className="font-serif text-2xl text-inv-olive-deep mt-1.5">{title}</h2>
    </header>
  );
}

function CornerOrnament({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute w-10 h-10 text-inv-rose ${className}`}
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
