"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSupabase } from "@/lib/use-supabase";
import type { Wedding } from "@/lib/types";
import { geocodePlace } from "@/lib/mapbox";
import { coupleInitials } from "@/lib/event-format";
import {
  canChangeRole,
  canDeleteMember,
  canManageEvent,
  creatableRoles,
  roleLabel,
  type MemberRole,
} from "@/lib/roles";

const VenueMap = dynamic(() => import("@/components/venue-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[220px] rounded-2xl bg-field animate-pulse" />
  ),
});

const inputCls =
  "w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 shadow-card";

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-muted mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border border-line shadow-card overflow-hidden">
      <header className="flex items-start gap-3 px-4 md:px-5 py-4 border-b border-line">
        <span className="w-9 h-9 rounded-xl bg-gold-faint text-gold-deep dark:bg-gold/15 dark:text-gold flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-content">{title}</h2>
          <p className="text-[11px] text-muted-soft mt-0.5 leading-relaxed">{description}</p>
        </div>
        {action}
      </header>
      <div className="p-4 md:p-5 space-y-4">{children}</div>
    </section>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-content">{title}</p>
          <p className="text-[11px] text-muted-soft mt-0.5 leading-relaxed">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            checked ? "bg-ink dark:bg-gold" : "bg-line-strong"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {checked && children}
    </div>
  );
}

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

  // Ceremonia (opcional) y hora de la recepción
  const [ceremonyName, setCeremonyName] = useState("");
  const [ceremonyCountry, setCeremonyCountry] = useState("");
  const [ceremonyCity, setCeremonyCity] = useState("");
  const [ceremonyAddress, setCeremonyAddress] = useState("");
  const [ceremonyDate, setCeremonyDate] = useState("");
  const [ceremonyTime, setCeremonyTime] = useState("");
  const [receptionTime, setReceptionTime] = useState("");
  const [ceremonyMapLat, setCeremonyMapLat] = useState<number | null>(null);
  const [ceremonyMapLng, setCeremonyMapLng] = useState<number | null>(null);
  const [ceremonyPinLat, setCeremonyPinLat] = useState<number | null>(null);
  const [ceremonyPinLng, setCeremonyPinLng] = useState<number | null>(null);
  const [ceremonyGeocoding, setCeremonyGeocoding] = useState(false);
  const [ceremonyGeocodeError, setCeremonyGeocodeError] = useState("");

  // Sobre y previa con solo las iniciales de los novios
  const [coverInitials, setCoverInitials] = useState(false);

  // Instantánea de lo guardado, para saber si hay cambios sin guardar
  const [baseline, setBaseline] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  // Confirmación: "in_app" (botón en la invitación) u "organizer" (con quien envió la invitación)
  const [confirmByOrganizer, setConfirmByOrganizer] = useState(false);

  // Lugar sorpresa: solo lo ve quien confirma (lo entrega /api/pass)
  const [revealOn, setRevealOn] = useState(false);
  const [revealName, setRevealName] = useState("");
  const [revealCountry, setRevealCountry] = useState("");
  const [revealCity, setRevealCity] = useState("");
  const [revealAddress, setRevealAddress] = useState("");
  const [revealMessage, setRevealMessage] = useState("");
  const [revealMapLat, setRevealMapLat] = useState<number | null>(null);
  const [revealMapLng, setRevealMapLng] = useState<number | null>(null);
  const [revealPinLat, setRevealPinLat] = useState<number | null>(null);
  const [revealPinLng, setRevealPinLng] = useState<number | null>(null);
  const [revealGeocoding, setRevealGeocoding] = useState(false);
  const [revealGeocodeError, setRevealGeocodeError] = useState("");
  const [role, setRole] = useState("organizer");
  const [team, setTeam] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState<MemberRole>("scanner");
  const [staffError, setStaffError] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const supabase = useSupabase();

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
    if (!canManageEvent(organizer.role)) {
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
      setVenueCountry(w.venue_country || "");
      setVenueCity(w.venue_city || "");
      setVenueAddress(w.venue_address || "");
      if (w.venue_lat && w.venue_lng) {
        setMapLat(w.venue_lat);
        setMapLng(w.venue_lng);
        setPinLat(w.venue_lat);
        setPinLng(w.venue_lng);
      }
      setConfirmByOrganizer(w.confirmation_mode === "organizer");
      setRevealOn(!!w.reveal_venue_name);
      setRevealName(w.reveal_venue_name || "");
      setRevealCountry(w.reveal_venue_country || "");
      setRevealCity(w.reveal_venue_city || "");
      setRevealAddress(w.reveal_venue_address || "");
      setRevealMessage(w.reveal_message || "");
      if (w.reveal_venue_lat && w.reveal_venue_lng) {
        setRevealMapLat(w.reveal_venue_lat);
        setRevealMapLng(w.reveal_venue_lng);
        setRevealPinLat(w.reveal_venue_lat);
        setRevealPinLng(w.reveal_venue_lng);
      }
      setCoverInitials(!!w.cover_initials);
      setCeremonyName(w.ceremony_name || "");
      setCeremonyCountry(w.ceremony_country || "");
      setCeremonyCity(w.ceremony_city || "");
      setCeremonyAddress(w.ceremony_address || "");
      setCeremonyDate(w.ceremony_date || "");
      setCeremonyTime(w.ceremony_time || "");
      setReceptionTime(w.reception_time || "");
      if (w.ceremony_lat && w.ceremony_lng) {
        setCeremonyMapLat(w.ceremony_lat);
        setCeremonyMapLng(w.ceremony_lng);
        setCeremonyPinLat(w.ceremony_lat);
        setCeremonyPinLng(w.ceremony_lng);
      }
      setBaseline(
        JSON.stringify({
          coupleName: w.couple_name || "",
          eventDate: w.event_date ? w.event_date.split("T")[0] : "",
          dressCode: w.dress_code || "",
          venueName: w.venue_name || "",
          venueCountry: w.venue_country || "",
          venueCity: w.venue_city || "",
          venueAddress: w.venue_address || "",
          pinLat: w.venue_lat && w.venue_lng ? w.venue_lat : null,
          pinLng: w.venue_lat && w.venue_lng ? w.venue_lng : null,
          confirmByOrganizer: w.confirmation_mode === "organizer",
          revealOn: !!w.reveal_venue_name,
          revealName: w.reveal_venue_name || "",
          revealCountry: w.reveal_venue_country || "",
          revealCity: w.reveal_venue_city || "",
          revealAddress: w.reveal_venue_address || "",
          revealMessage: w.reveal_message || "",
          revealPinLat: w.reveal_venue_lat && w.reveal_venue_lng ? w.reveal_venue_lat : null,
          revealPinLng: w.reveal_venue_lat && w.reveal_venue_lng ? w.reveal_venue_lng : null,
          coverInitials: !!w.cover_initials,
          ceremonyName: w.ceremony_name || "",
          ceremonyCountry: w.ceremony_country || "",
          ceremonyCity: w.ceremony_city || "",
          ceremonyAddress: w.ceremony_address || "",
          ceremonyDate: w.ceremony_date || "",
          ceremonyTime: w.ceremony_time || "",
          receptionTime: w.reception_time || "",
          ceremonyPinLat: w.ceremony_lat && w.ceremony_lng ? w.ceremony_lat : null,
          ceremonyPinLng: w.ceremony_lat && w.ceremony_lng ? w.ceremony_lng : null,
        })
      );
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleGeocode() {
    setGeocoding(true);
    setGeocodeError("");
    const result = await geocodePlace({ name: venueName, address: venueAddress, city: venueCity, country: venueCountry });
    if ("error" in result) {
      setGeocodeError(result.error);
    } else {
      setMapLat(result.lat);
      setMapLng(result.lng);
      setPinLat(result.lat);
      setPinLng(result.lng);
    }
    setGeocoding(false);
  }

  async function handleRevealGeocode() {
    setRevealGeocoding(true);
    setRevealGeocodeError("");
    const result = await geocodePlace({ name: revealName, address: revealAddress, city: revealCity, country: revealCountry });
    if ("error" in result) {
      setRevealGeocodeError(result.error);
    } else {
      setRevealMapLat(result.lat);
      setRevealMapLng(result.lng);
      setRevealPinLat(result.lat);
      setRevealPinLng(result.lng);
    }
    setRevealGeocoding(false);
  }

  async function handleCeremonyGeocode() {
    setCeremonyGeocoding(true);
    setCeremonyGeocodeError("");
    const result = await geocodePlace({
      name: ceremonyName,
      address: ceremonyAddress,
      city: ceremonyCity,
      country: ceremonyCountry,
    });
    if ("error" in result) {
      setCeremonyGeocodeError(result.error);
    } else {
      setCeremonyMapLat(result.lat);
      setCeremonyMapLng(result.lng);
      setCeremonyPinLat(result.lat);
      setCeremonyPinLng(result.lng);
    }
    setCeremonyGeocoding(false);
  }

  async function handleSave() {
    if (!wedding) return;
    setSaving(true);
    setSaved(false);
    setSaveError(false);

    const { error: updateError } = await supabase
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
        // Iniciales en el sobre: solo si la migración 007 ya existe
        ...(wedding && "cover_initials" in wedding ? { cover_initials: coverInitials } : {}),
        // Ceremonia y hora de la recepción: solo si la migración 006 ya existe
        ...(wedding && "ceremony_name" in wedding
          ? {
              ceremony_name: ceremonyName.trim() || null,
              ceremony_country: ceremonyName.trim() ? ceremonyCountry || null : null,
              ceremony_city: ceremonyName.trim() ? ceremonyCity || null : null,
              ceremony_address: ceremonyName.trim() ? ceremonyAddress || null : null,
              ceremony_lat: ceremonyName.trim() ? ceremonyPinLat : null,
              ceremony_lng: ceremonyName.trim() ? ceremonyPinLng : null,
              ceremony_date: ceremonyName.trim() ? ceremonyDate || null : null,
              ceremony_time: ceremonyName.trim() ? ceremonyTime || null : null,
              reception_time: receptionTime || null,
            }
          : {}),
        // Solo se envía si la migración 005 ya existe, para no romper el guardado
        ...(wedding && "confirmation_mode" in wedding
          ? { confirmation_mode: confirmByOrganizer ? "organizer" : "in_app" }
          : {}),
        // Lugar sorpresa: desactivado = se borran los datos (la función queda apagada).
        // Solo se envía si la migración 003 ya existe, para no romper el guardado.
        ...(wedding && "reveal_venue_name" in wedding
          ? {
              reveal_venue_name: revealOn && revealName.trim() ? revealName.trim() : null,
              reveal_venue_country: revealOn ? revealCountry || null : null,
              reveal_venue_city: revealOn ? revealCity || null : null,
              reveal_venue_address: revealOn ? revealAddress || null : null,
              reveal_venue_lat: revealOn ? revealPinLat : null,
              reveal_venue_lng: revealOn ? revealPinLng : null,
              reveal_message: revealOn ? revealMessage.trim() || null : null,
            }
          : {}),
      })
      .eq("id", wedding.id);

    setSaving(false);
    if (updateError) {
      setSaveError(true);
      return;
    }
    setBaseline(current);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // --- Equipo ---
  const fetchTeam = useCallback(async () => {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setTeam(data.staff || []);
      setMyId(data.myId || null);
    }
  }, []);

  useEffect(() => { if (canManageEvent(role)) fetchTeam(); }, [role, fetchTeam]);

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
        body: JSON.stringify({ name: staffName, email: staffEmail, password: staffPassword, role: staffRole }),
      });
      const data = await res.json();
      if (!res.ok) { setStaffError(data.error); return; }
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");
      setStaffRole("scanner");
      setShowAddStaff(false);
      fetchTeam();
    } catch {
      setStaffError("Error de conexión");
    } finally {
      setStaffLoading(false);
    }
  }

  async function handleRemoveStaff(id: string) {
    const res = await fetch("/api/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setStaffError(data?.error || "No se pudo eliminar");
      return;
    }
    fetchTeam();
  }

  async function handleChangeRole(id: string, newRole: MemberRole) {
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: newRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setStaffError(data?.error || "No se pudo cambiar el rol");
      return;
    }
    fetchTeam();
  }

  const current = JSON.stringify({
    coupleName,
    eventDate,
    dressCode,
    venueName,
    venueCountry,
    venueCity,
    venueAddress,
    pinLat,
    pinLng,
    confirmByOrganizer,
    revealOn,
    revealName,
    revealCountry,
    revealCity,
    revealAddress,
    revealMessage,
    revealPinLat,
    revealPinLng,
    coverInitials,
    ceremonyName,
    ceremonyCountry,
    ceremonyCity,
    ceremonyAddress,
    ceremonyDate,
    ceremonyTime,
    receptionTime,
    ceremonyPinLat,
    ceremonyPinLng,
  });
  const dirty = baseline !== null && current !== baseline;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-muted-soft text-sm">Cargando ajustes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-28 md:pb-10">
      <div className="max-w-md md:max-w-3xl mx-auto">
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-5 md:px-8 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between border-b border-line-strong/70">
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

        <div className="px-5 md:px-8 pt-6 space-y-5">
          {/* Evento */}
          <SettingsSection
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            title="Evento"
            description="Datos generales que ven los invitados en su invitación"
          >
            <Field label="Nombre de la pareja">
              <input
                type="text"
                value={coupleName}
                onChange={(e) => setCoupleName(e.target.value)}
                placeholder="Ana & Carlos"
                className={inputCls}
              />
            </Field>
            <div className="space-y-2">
              <SwitchRow
                title="Mostrar solo las iniciales en el sobre"
                description="En el sobre y la previa se verán solo las iniciales; los nombres completos aparecen con el video y dentro de la invitación."
                checked={coverInitials}
                onChange={setCoverInitials}
              />
              {coverInitials && (
                <p className="text-[11px] text-muted-soft">
                  {coupleInitials(coupleName) ? (
                    <>
                      Se verá: <span className="font-semibold text-content">{coupleInitials(coupleName)}</span>
                    </>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">
                      Escribe el nombre como &quot;Ana &amp; Carlos&quot; para generar las iniciales; mientras
                      tanto se mostrará el nombre completo.
                    </span>
                  )}
                </p>
              )}
              {wedding && !("cover_initials" in wedding) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Falta ejecutar la migración 007_cover_initials.sql en Supabase para guardar esta opción.
                </p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Fecha del evento">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Código de vestimenta">
                <input
                  type="text"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  placeholder="Formal / Cóctel / Casual"
                  className={inputCls}
                />
              </Field>
            </div>
          </SettingsSection>

          {/* Ceremonia */}
          <SettingsSection
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2v4M10 4h4" />
                <path d="M5 22V11l7-5 7 5v11" />
                <path d="M10 22v-6a2 2 0 0 1 4 0v6" />
              </svg>
            }
            title="Ceremonia"
            description="Opcional. Déjalo vacío si ceremonia y recepción son en el mismo lugar."
          >
            <Field label="Lugar de la ceremonia">
              <input
                type="text"
                value={ceremonyName}
                onChange={(e) => setCeremonyName(e.target.value)}
                placeholder="Parroquia / Iglesia / Jardín"
                className={inputCls}
              />
            </Field>

            {ceremonyName.trim() && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Fecha de la ceremonia">
                    <input
                      type="date"
                      value={ceremonyDate}
                      onChange={(e) => setCeremonyDate(e.target.value)}
                      className={inputCls}
                    />
                    <p className="text-[11px] text-muted-soft mt-1">
                      Si la dejas vacía se usa la fecha del evento.
                    </p>
                  </Field>
                  <Field label="Hora de la ceremonia">
                    <input
                      type="time"
                      value={ceremonyTime}
                      onChange={(e) => setCeremonyTime(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="País">
                    <input
                      type="text"
                      value={ceremonyCountry}
                      onChange={(e) => setCeremonyCountry(e.target.value)}
                      placeholder="México"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Ciudad">
                    <input
                      type="text"
                      value={ceremonyCity}
                      onChange={(e) => setCeremonyCity(e.target.value)}
                      placeholder="Ciudad de México"
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="Dirección (calle y número)">
                  <input
                    type="text"
                    value={ceremonyAddress}
                    onChange={(e) => setCeremonyAddress(e.target.value)}
                    placeholder="Av. Insurgentes 123"
                    className={inputCls}
                  />
                </Field>

                <div className="space-y-3 pt-4 border-t border-line">
                  <div>
                    <p className="text-xs font-semibold text-content-soft">Ubicación en el mapa</p>
                    <p className="text-[11px] text-muted-soft mt-0.5">
                      Busca la ubicación y ajusta el pin arrastrándolo o tocando el mapa
                    </p>
                  </div>
                  <button
                    onClick={handleCeremonyGeocode}
                    disabled={ceremonyGeocoding}
                    className="w-full bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    {ceremonyGeocoding ? "Buscando..." : "Buscar en mapa"}
                  </button>
                  {ceremonyGeocodeError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{ceremonyGeocodeError}</p>
                  )}
                  {ceremonyMapLat !== null && ceremonyMapLng !== null && (
                    <div className="space-y-2">
                      <VenueMap
                        lat={ceremonyMapLat}
                        lng={ceremonyMapLng}
                        name={ceremonyName || "Ceremonia"}
                        height={220}
                        draggable
                        onPositionChange={(lat, lng) => {
                          setCeremonyPinLat(lat);
                          setCeremonyPinLng(lng);
                        }}
                      />
                      <p className="text-[11px] text-muted-soft text-center font-mono">
                        {ceremonyPinLat?.toFixed(5)}, {ceremonyPinLng?.toFixed(5)}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            {wedding && !("ceremony_name" in wedding) && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Falta ejecutar la migración 006_ceremony.sql en Supabase para guardar la ceremonia y la hora de la recepción.
              </p>
            )}
          </SettingsSection>

          {/* Recepción (el lugar de después de la ceremonia) */}
          <SettingsSection
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
            title="Recepción"
            description="El lugar de después de la ceremonia. Es el que ven todos los invitados y el que va en el correo."
          >
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <Field label="Lugar de la recepción">
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Salón de eventos"
                  className={inputCls}
                />
              </Field>
              <Field label="Hora de la recepción">
                <input
                  type="time"
                  value={receptionTime}
                  onChange={(e) => setReceptionTime(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="País">
                <input
                  type="text"
                  value={venueCountry}
                  onChange={(e) => setVenueCountry(e.target.value)}
                  placeholder="México"
                  className={inputCls}
                />
              </Field>
              <Field label="Ciudad">
                <input
                  type="text"
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  placeholder="Ciudad de México"
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Dirección (calle y número)">
              <input
                type="text"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Av. Insurgentes 123"
                className={inputCls}
              />
            </Field>

            <div className="space-y-3 pt-4 border-t border-line">
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
          </SettingsSection>

          {/* Confirmación y lugar sorpresa */}
          <SettingsSection
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="m8.5 12.5 2.5 2.5 4.5-5" />
              </svg>
            }
            title="Confirmación y lugar sorpresa"
            description="Cómo confirman los invitados y qué ven al hacerlo"
          >
            <SwitchRow
              title="Confirmar con quien envió la invitación"
              description="Se oculta el botón de confirmar. Tú los marcas como confirmados desde la lista de invitados (botón Confirmar): entonces se desbloquea su código QR."
              checked={confirmByOrganizer}
              onChange={setConfirmByOrganizer}
            />
            {wedding && !("confirmation_mode" in wedding) && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Falta ejecutar la migración 005_confirmation_mode.sql en Supabase para guardar esta opción.
              </p>
            )}

            <div className="pt-4 border-t border-line">
              <SwitchRow
                title="Lugar sorpresa"
                description="Solo lo ven quienes confirman su asistencia. El lugar de arriba es el que ven todos: ponlo como el lugar que quieres mostrar al inicio."
                checked={revealOn}
                onChange={setRevealOn}
              >
                <div className="space-y-4">
                  <Field label="Lugar real del evento">
                    <input
                      type="text"
                      value={revealName}
                      onChange={(e) => setRevealName(e.target.value)}
                      placeholder="Salón de eventos"
                      className={inputCls}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="País">
                      <input
                        type="text"
                        value={revealCountry}
                        onChange={(e) => setRevealCountry(e.target.value)}
                        placeholder="México"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Ciudad">
                      <input
                        type="text"
                        value={revealCity}
                        onChange={(e) => setRevealCity(e.target.value)}
                        placeholder="Ciudad de México"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field label="Dirección (calle y número)">
                    <input
                      type="text"
                      value={revealAddress}
                      onChange={(e) => setRevealAddress(e.target.value)}
                      placeholder="Av. Insurgentes 123"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Mensaje de revelación">
                    <textarea
                      value={revealMessage}
                      onChange={(e) => setRevealMessage(e.target.value)}
                      rows={4}
                      placeholder="Por ser fiel y confirmar, te contamos que la celebración no será donde decía la invitación. Nos vemos en:"
                      className={`${inputCls} resize-none`}
                    />
                    <p className="text-[11px] text-muted-soft mt-1">
                      Si lo dejas vacío se usa el texto por defecto.
                    </p>
                  </Field>

                  <button
                    onClick={handleRevealGeocode}
                    disabled={revealGeocoding}
                    className="w-full bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    {revealGeocoding ? "Buscando..." : "Buscar en mapa"}
                  </button>

                  {revealGeocodeError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">{revealGeocodeError}</p>
                  )}

                  {revealMapLat !== null && revealMapLng !== null && (
                    <div className="space-y-2">
                      <VenueMap
                        lat={revealMapLat}
                        lng={revealMapLng}
                        name={revealName || "Lugar sorpresa"}
                        height={220}
                        draggable
                        onPositionChange={(lat, lng) => {
                          setRevealPinLat(lat);
                          setRevealPinLng(lng);
                        }}
                      />
                      <p className="text-[11px] text-muted-soft text-center font-mono">
                        {revealPinLat?.toFixed(5)}, {revealPinLng?.toFixed(5)}
                      </p>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-soft">
                    Al activarlo, abrir la invitación ya no confirma: los invitados confirman con un
                    botón (o con quien envió la invitación). Si lo desactivas y guardas, se borran
                    estos datos.
                  </p>
                </div>
              </SwitchRow>
            </div>
          </SettingsSection>

          {/* Equipo */}
          {canManageEvent(role) && (
            <SettingsSection
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              title="Equipo"
              description="Usuarios del evento y sus roles. Los cambios aquí se aplican al instante."
              action={
                <button
                  onClick={() => setShowAddStaff(!showAddStaff)}
                  className="w-9 h-9 rounded-full bg-field flex items-center justify-center text-muted hover:bg-line-strong/60 transition-colors shrink-0"
                  title="Agregar miembro"
                  aria-label="Agregar miembro"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              }
            >
            {/* Staff list */}
            {team.length > 0 && (
              <div className="space-y-2">
                {team.map((s) => {
                  const isSelf = s.id === myId;
                  return (
                    <div key={s.id} className="p-2.5 bg-field rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-content truncate">
                            {s.name || s.email}
                            {isSelf && <span className="text-[11px] text-muted-soft font-medium"> (tú)</span>}
                          </p>
                          <p className="text-[11px] text-muted truncate">{s.email}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-ink/5 dark:bg-gold/15 text-gold-deep dark:text-gold shrink-0">
                          {roleLabel(s.role)}
                        </span>
                        {canDeleteMember(role, s.role, isSelf) && (
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
                        )}
                      </div>
                      {canChangeRole(role, isSelf) && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-soft shrink-0">Rol:</span>
                          <select
                            value={s.role}
                            onChange={(e) => handleChangeRole(s.id, e.target.value as MemberRole)}
                            className="flex-1 bg-card border border-line-strong rounded-lg px-2.5 py-1.5 text-xs text-content focus:outline-none focus:ring-2 focus:ring-ink/10"
                          >
                            <option value="scanner">Portero</option>
                            <option value="organizer">Organizador</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <div>
                  <label className="text-xs font-semibold text-muted mb-1.5 block">
                    Rol
                  </label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value as MemberRole)}
                    className="w-full bg-field border border-line-strong rounded-xl px-4 py-2.5 text-sm text-content focus:outline-none focus:ring-2 focus:ring-ink/10"
                  >
                    {creatableRoles(role).map((r) => (
                      <option key={r} value={r}>{roleLabel(r)}</option>
                    ))}
                  </select>
                </div>
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
              <p className="text-[11px] text-muted-soft">No hay miembros aún</p>
            )}
            </SettingsSection>
          )}

          {/* Barra de guardado fija */}
          <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-4 z-30 bg-card/95 backdrop-blur-md border border-line-strong rounded-2xl shadow-lift px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium min-w-0 truncate" role="status" aria-live="polite">
              {saveError ? (
                <span className="text-rose-600 dark:text-rose-400">No se pudo guardar. Intenta de nuevo.</span>
              ) : dirty ? (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Cambios sin guardar
                </span>
              ) : (
                <span className="text-muted-soft">Todo guardado</span>
              )}
            </p>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="shrink-0 bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-2.5 px-5 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-40"
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
    </div>
  );
}
