"use client";

import { use, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import QRCode from "qrcode";

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

  useEffect(() => {
    async function loadPass() {
      try {
        // Fetch pass data from API
        const res = await fetch(`/api/pass/${uuid}`);
        if (!res.ok) throw new Error("Pase no encontrado");
        const data: PassData = await res.json();
        setPassData(data);

        // Si todos los invitados del grupo ya confirmaron, mostrar como confirmado
        if (data.confirmed_count >= data.guest_count && data.guest_count > 0) {
          setRsvpState("confirmed");
        }
      } catch {
        setError("Pase no encontrado o expirado");
      } finally {
        setLoading(false);
      }
    }
    loadPass();
  }, [uuid]);

  // El QR se genera solo cuando la asistencia está confirmada
  useEffect(() => {
    if (rsvpState !== "confirmed") return;
    let cancelled = false;

    async function generateQr() {
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

  async function handleRsvp() {
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
      } else {
        setRsvpState("idle");
      }
    } catch {
      setRsvpState("idle");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Cargando pase...</div>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
          <h1 className="font-serif text-xl text-ink mb-2">Pase no válido</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="px-6 pt-8 pb-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.35em] text-gold-deep font-semibold">
            Se complacen en invitarte
          </p>
          <h1 className="font-serif text-3xl text-ink mt-2 leading-tight">
            {passData.couple_name}
          </h1>
          <p className="text-xs text-slate-500 mt-2 tracking-wide">
            {passData.event_date}
          </p>
        </header>

        {/* Pass Card */}
        <section className="px-6">
          <div className="bg-white rounded-[28px] shadow-lift border border-slate-100 overflow-hidden">
            {/* Top strip */}
            <div className="bg-ink px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">
                  Pase VIP
                </p>
                <p className="text-white text-sm font-semibold mt-0.5">
                  {passData.group_name}
                </p>
              </div>
              <span className="w-9 h-9 rounded-full bg-white/10 text-gold flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </span>
            </div>

            {/* QR Zone */}
            <div className="px-6 pt-7 pb-6 flex flex-col items-center">
              {rsvpState === "confirmed" ? (
                <>
                  <div className="bg-white p-4 rounded-2xl border-2 border-ink">
                    {qrDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrDataUrl}
                        alt="Código de acceso"
                        className="w-52 h-52 object-contain"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-3 tracking-wider">
                    Código · {uuid.toUpperCase().slice(0, 4)}-{uuid.toUpperCase().slice(4, 8)}-{uuid.toUpperCase().slice(8, 12)}-{uuid.toUpperCase().slice(12, 16)}
                  </p>
                  <div className="flex items-center gap-2 mt-4 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Válido para {passData.guest_count} personas
                  </div>
                </>
              ) : (
                <>
                  <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-3 px-6">
                    <span className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                    <p className="text-xs text-slate-500 text-center leading-relaxed">
                      Confirma tu asistencia para desbloquear tu código QR de entrada
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 tracking-wide">
                    Tu código se generará al confirmar
                  </p>
                </>
              )}
            </div>

            {/* Perforation */}
            <div className="relative px-6">
              <div className="border-t-2 border-dashed border-slate-200" />
              <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
              <span className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-slate-50" />
            </div>

            {/* Details */}
            <div className="px-6 py-6 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6 2v-4h-2V8c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v2H6v4h2v2h8v-2h2z" />
                  </svg>
                  Mesa
                </p>
                <p className="text-lg font-bold text-ink mt-1">
                  Mesa {passData.table_number}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Cupo
                </p>
                <p className="text-lg font-bold text-ink mt-1">
                  {passData.guest_count} invitados
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Hora
                </p>
                <p className="text-lg font-bold text-ink mt-1">
                  {passData.event_time || "17:00 hrs"}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.38 3.46 16 2 12 3.46 8 2 3.62 3.46a2 2 0 0 0-1.34 1.89v13.3a2 2 0 0 0 2.66 1.89L8 19l4-1.46L16 19l4.38-1.46a2 2 0 0 0 1.34-1.89V5.35a2 2 0 0 0-1.34-1.89z" />
                    <line x1="12" y1="2" x2="12" y2="17.54" />
                  </svg>
                  Vestimenta
                </p>
                <p className="text-lg font-bold text-ink mt-1">
                  {passData.dress_code || "Formal / Gala"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Location Card */}
        {passData.venue_name && (
          <section className="px-6 pt-5">
            <div className="bg-white rounded-3xl shadow-card border border-slate-100 overflow-hidden">
              {/* Map */}
              {passData.venue_lat && passData.venue_lng ? (
                <VenueMap
                  lat={passData.venue_lat}
                  lng={passData.venue_lng}
                  name={passData.venue_name}
                  height={192}
                />
              ) : (
                <div className="w-full h-48 bg-slate-100 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-200" />
                  <div className="relative z-10 text-center">
                    <div className="w-10 h-10 rounded-full bg-ink border-3 border-gold flex items-center justify-center mx-auto shadow-lg">
                      <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-gold-faint text-gold-deep flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{passData.venue_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {passData.venue_address}
                    </p>
                  </div>
                </div>
                <a
                  href={
                    passData.venue_lat && passData.venue_lng
                      ? `https://www.google.com/maps/search/?api=1&query=${passData.venue_lat},${passData.venue_lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${passData.venue_name || ""} ${passData.venue_address || ""}`
                        )}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full bg-ink text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-lift hover:bg-ink-light transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                  Cómo llegar
                </a>
              </div>
            </div>
          </section>
        )}

        {/* RSVP */}
        <section className="px-6 pt-5">
          {rsvpState === "confirmed" ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-700">¡Asistencia confirmada!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Presenta tu código QR en la entrada — ¡nos vemos pronto!
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleRsvp}
              disabled={rsvpState === "loading"}
              className="w-full bg-ink text-white rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lift hover:bg-ink-light transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              {rsvpState === "loading"
                ? "Confirmando..."
                : "Confirmar asistencia"}
            </button>
          )}
        </section>

        {/* Actions */}
        <section className="px-6 pt-5">
          <div className="flex gap-3">
            <button className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4 text-sky" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Guardar en fotos
            </button>
            <button className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-slate-50 transition-colors">
              <svg className="w-4 h-4 text-sky" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Compartir
            </button>
          </div>
        </section>

        <footer className="px-6 pt-8 pb-4 text-center">
          <p className="text-[11px] text-slate-400">Presenta este código QR en la entrada</p>
          <p className="text-[10px] text-slate-300 mt-1 tracking-wide">Protegido por Attendapp</p>
        </footer>
      </div>
    </div>
  );
}
