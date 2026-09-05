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
  const [dressCode, setDressCode] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueCountry, setVenueCountry] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueAddress, setVenueAddress] = useState("");

  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [role, setRole] = useState("organizer");
  const [team, setTeam] = useState<{ id: string; name: string; email: string }[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffError, setStaffError] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: organizer } = await supabase
      .from("organizers")
      .select("wedding_id, role")
      .eq("user_id", user.id)
      .single();

    if (!organizer?.wedding_id) { setLoading(false); return; }

    // Los porteros no acceden a ajustes
    if (organizer.role === "scanner") {
      router.replace("/");
      return;
    }

    setRole(organizer.role || "organizer");

    const { data: w } = await supabase
      .from("weddings")
      .select("*")
      .eq("id", organizer.wedding_id)
      .single();

    if (w) {
      setWedding(w);
      setCoupleName(w.couple_name || "");
      setEventDate(w.event_date ? w.event_date.split("T")[0] : "");
      setDressCode(w.dress_code || "");
      setVenueName(w.venue_name || "");
      setVenueCountry((w as any).venue_country || "");
      setVenueCity((w as any).venue_city || "");
      setVenueAddress(w.venue_address || "");
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
    // Normalizar: quitar # y limpiar formato colombiano/latinoamericano
    const normalizedStreet = venueAddress
      .replace(/#/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalizedStreet && !venueCity && !venueCountry) {
      setGeocodeError("Escribe la dirección, ciudad y país para buscar en el mapa");
      return;
    }
    setGeocoding(true);
    setGeocodeError("");

    try {
      // Query estructurado de Nominatim - mucho más preciso que query libre
      const params = new URLSearchParams({
        format: "json",
        limit: "1",
        addressdetails: "1",
      });

      if (venueName || normalizedStreet) {
        params.set("street", [venueName, normalizedStreet].filter(Boolean).join(" "));
      }
      if (venueCity) params.set("city", venueCity);
      if (venueCountry) params.set("country", venueCountry);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];

      if (!data || data.length === 0) {
        setGeocodeError("No se encontró la dirección. Intenta con más detalle.");
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
        dress_code: dressCode || null,
        venue_name: venueName,
        venue_country: venueCountry || null,
        venue_city: venueCity || null,
        venue_address: venueAddress || null,
        venue_lat: pinLat,
        venue_lng: pinLng,
      })
      .eq("id", wedding.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // --- Equipo ---
  const fetchTeam = useCallback(async () => {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setTeam(data.staff || []);
    }
  }, []);

  useEffect(() => { if (role === "organizer") fetchTeam(); }, [role, fetchTeam]);

  async function handleAddStaff() {
    if (!staffEmail || !staffPassword) {
      setStaffError("Email y contraseña son requeridos");
      return;
    }
    if (staffPassword.length < 6) {
      setStaffError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setStaffLoading(true);
    setStaffError("");
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: staffName, email: staffEmail, password: staffPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setStaffError(data.error); return; }
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");
      setShowAddStaff(false);
      fetchTeam();
    } catch {
      setStaffError("Error de conexión");
    } finally {
      setStaffLoading(false);
    }
  }

  async function handleRemoveStaff(id: string) {
    await fetch("/api/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchTeam();
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

          {/* Country */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              País
            </label>
            <input
              type="text"
              value={venueCountry}
              onChange={(e) => setVenueCountry(e.target.value)}
              placeholder="México"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card"
            />
          </div>

          {/* City */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              Ciudad
            </label>
            <input
              type="text"
              value={venueCity}
              onChange={(e) => setVenueCity(e.target.value)}
              placeholder="Ciudad de México"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card"
            />
          </div>

          {/* Street Address */}
          <div>
            <label className="text-xs font-semibold text-muted mb-1.5 block">
              Dirección (calle y número)
            </label>
            <input
              type="text"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Av. Insurgentes 123"
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

          {/* Equipo de puerta */}
          {role === "organizer" && (
          <div className="bg-card rounded-2xl border border-line shadow-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-content-soft">Equipo de puerta</p>
                <p className="text-[11px] text-muted-soft mt-0.5">
                  Porteros que pueden escanear invitados
                </p>
              </div>
              <button
                onClick={() => setShowAddStaff(!showAddStaff)}
                className="w-8 h-8 rounded-full bg-field flex items-center justify-center text-muted hover:bg-line-strong/60 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Staff list */}
            {team.length > 0 && (
              <div className="space-y-2">
                {team.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-field rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-content truncate">{s.name || s.email}</p>
                      <p className="text-[11px] text-muted truncate">{s.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveStaff(s.id)}
                      className="w-8 h-8 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center shrink-0 transition-colors"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add staff form */}
            {showAddStaff && (
              <div className="space-y-2.5 pt-2 border-t border-line">
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="w-full bg-field border border-line-strong rounded-xl px-4 py-2.5 text-sm text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-field border border-line-strong rounded-xl px-4 py-2.5 text-sm text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
                <input
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Contraseña (mín. 6 caracteres)"
                  className="w-full bg-field border border-line-strong rounded-xl px-4 py-2.5 text-sm text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
                {staffError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{staffError}</p>
                )}
                <button
                  onClick={handleAddStaff}
                  disabled={staffLoading}
                  className="w-full bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
                >
                  {staffLoading ? "Creando..." : "Agregar al equipo"}
                </button>
              </div>
            )}

            {team.length === 0 && !showAddStaff && (
              <p className="text-[11px] text-muted-soft">No hay porteros aún</p>
            )}
          </div>
          )}

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
