"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { Wedding } from "@/lib/types";

const VenueMap = dynamic(() => import("@/components/venue-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[220px] rounded-2xl bg-field animate-pulse" />
  ),
});

export default function AjustesPage() {
  const router = useRouter();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [coupleName, setCoupleName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [dressCode, setDressCode] = useState("");

  // Coordenadas: mapLat/mapLng = posición del mapa; pinLat/pinLng = posición actual del pin
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: organizer } = await supabase
      .from("organizers")
      .select("wedding_id")
      .eq("user_id", user.id)
      .single();

    if (!organizer?.wedding_id) { setLoading(false); return; }

    const { data: w } = await supabase
      .from("weddings")
      .select("*")
      .eq("id", organizer.wedding_id)
      .single();

    if (w) {
      setWedding(w);
      setCoupleName(w.couple_name || "");
      setEventDate(w.event_date ? w.event_date.split("T")[0] : "");
      setVenueName(w.venue_name || "");
      setVenueAddress(w.venue_address || "");
      setDressCode(w.dress_code || "");
      if (w.venue_lat && w.venue_lng) {
        setMapLat(w.venue_lat);
        setMapLng(w.venue_lng);
        setPinLat(w.venue_lat);
        setPinLng(w.venue_lng);
      }
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGeocode() {
    const query = [venueName, venueAddress].filter(Boolean).join(", ");
    if (!query) {
      setGeocodeError("Escribe el nombre del lugar y la dirección primero");
      return;
    }
    setGeocoding(true);
    setGeocodeError("");

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const data = (await res.json()) as { lat: string; lon: string }[];

      if (!data || data.length === 0) {
        setGeocodeError("No se encontró la dirección. Intenta agregar la ciudad.");
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      setMapLat(lat);
      setMapLng(lng);
      setPinLat(lat);
      setPinLng(lng);
    } catch {
      setGeocodeError("Error al buscar. Verifica tu conexión.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSave() {
    if (!wedding) return;
    setSaving(true);
    setSaved(false);

    await supabase
      .from("weddings")
      .update({
        couple_name: coupleName,
        event_date: eventDate ? new Date(eventDate).toISOString() : wedding.event_date,
        venue_name: venueName,
        venue_address: venueAddress,
        dress_code: dressCode || null,
        venue_lat: pinLat,
        venue_lng: pinLng,
      })
      .eq("id", wedding.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-muted-soft text-sm">Cargando ajustes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-28">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between border-b border-line-strong/70">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-content font-medium text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Atrás
          </button>
          <h1 className="font-serif text-lg text-content">Ajustes</h1>
          <span className="w-16" />
        </header>

        <div className="px-5 pt-6 space-y-5">
          {/* Couple Name */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              Nombre de la pareja
            </label>
            <input
              type="text"
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              placeholder="Ana & Carlos"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card"
            />
          </div>

          {/* Event Date */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              Fecha del evento
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card"
            />
          </div>

          {/* Venue Name */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              Lugar del evento
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="Salón de eventos"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card"
            />
          </div>

          {/* Venue Address */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              Dirección
            </label>
            <input
              type="text"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Calle ejemplo 123, Ciudad"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card"
            />
          </div>

          {/* Dress Code */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              Código de vestimenta
            </label>
            <input
              type="text"
              value={dressCode}
              onChange={(e) => setDressCode(e.target.value)}
              placeholder="Formal / Cóctel / Casual"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card"
            />
          </div>

          {/* Venue Map */}
          <div className="bg-card rounded-2xl border border-line shadow-card p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-content-soft">Ubicación en el mapa</p>
              <p className="text-[11px] text-muted-soft mt-0.5">
                Busca la ubicación y ajusta el pin arrastrándolo o tocando el mapa
              </p>
            </div>

            <button
              onClick={handleGeocode}
              disabled={geocoding}
              className="w-full bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {geocoding ? "Buscando..." : "Buscar en mapa"}
            </button>

            {geocodeError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{geocodeError}</p>
            )}

            {mapLat !== null && mapLng !== null && (
              <div className="space-y-2">
                <VenueMap
                  lat={mapLat}
                  lng={mapLng}
                  name={venueName || "Lugar del evento"}
                  height={220}
                  draggable
                  onPositionChange={(lat, lng) => {
                    setPinLat(lat);
                    setPinLng(lng);
                  }}
                />
                <p className="text-[11px] text-muted-soft text-center font-mono">
                  {pinLat?.toFixed(5)}, {pinLng?.toFixed(5)}
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lift hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
          >
            {saving ? (
              "Guardando..."
            ) : saved ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Guardado
              </>
            ) : (
              "Guardar cambios"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
