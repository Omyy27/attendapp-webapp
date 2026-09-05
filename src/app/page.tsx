"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/ui/bottom-nav";
import { AnalyticsRing } from "@/components/analytics-ring";
import { GuestCard, type Guest } from "@/components/guest-card";
import { AddGuestModal } from "@/components/add-guest-modal";
import { EditGuestModal } from "@/components/edit-guest-modal";
import { DeleteConfirm } from "@/components/delete-confirm";
import { exportToCsv } from "@/lib/csv";
import { useDriverTour } from "@/lib/use-driver-tour";
import { UserAvatar } from "@/components/user-avatar";

const dashboardSteps = [
  { element: "#tour-header", popover: { title: "Bienvenido a Attendapp", description: "Aquí ves el nombre de tu evento y notificaciones." } },
  { element: "#tour-user-avatar", popover: { title: "Tu perfil", description: "Toca tu avatar para ver tu perfil y cerrar sesión." } },
  { element: "#tour-analytics", popover: { title: "Resumen del día", description: "Llegadas, pendientes y mesas activas en tiempo real." } },
  { element: "#tour-actions", popover: { title: "Acciones rápidas", description: "Descarga tu lista de invitados como CSV o agrega nuevos invitados." } },
  { element: "#tour-search", popover: { title: "Busca invitados", description: "Filtra por nombre, grupo familiar o estado de confirmación." } },
  { element: "#tour-guest-list", popover: { title: "Tu padrón", description: "Lista completa con el estado de cada invitado. Toca un nombre para ver detalles." } },
  { element: "#tour-nav", popover: { title: "Navegación", description: "Accede a Invitados, Escanear y Enviar pases desde aquí." } },
];

const filters = ["Todos", "Confirmados", "Por llegar", ];

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [weddingId, setWeddingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingGuest, setDeletingGuest] = useState<Guest | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [coupleName, setCoupleName] = useState("Mi evento");
  const [currentTime, setCurrentTime] = useState("");
  const [activeTables, setActiveTables] = useState(0);
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 20;

  const supabase = createClient();
  const { startTour } = useDriverTour("dashboard", dashboardSteps);

  useEffect(() => {
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [startTour]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let { data: organizer } = await supabase
      .from("organizers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!organizer) {
      const { data: newOrg } = await supabase
        .from("organizers")
        .insert({
          user_id: user.id,
          name: user.email?.split("@")[0] || "Organizador",
          email: user.email || "",
          role: "organizer",
        })
        .select()
        .single();
      organizer = newOrg;
    }

    if (!organizer) { setLoading(false); return; }

    if (!organizer.wedding_id) {
      const { data: wedding } = await supabase
        .from("weddings")
        .insert({
          title: "Nuestra boda",
          couple_name: "Novia y Novio",
          event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          venue_name: "Salón de fiestas",
        })
        .select()
        .single();

      if (wedding) {
        await supabase.from("organizers").update({ wedding_id: wedding.id }).eq("id", organizer.id);
        organizer.wedding_id = wedding.id;
      }
    }

    if (!organizer.wedding_id) { setLoading(false); return; }
    setWeddingId(organizer.wedding_id);

    const { data: wedding } = await supabase
      .from("weddings")
      .select("couple_name")
      .eq("id", organizer.wedding_id)
      .single();

    if (wedding) setCoupleName(wedding.couple_name);

    const { data: groups } = await supabase
      .from("guest_groups")
      .select("id, name, table_number, pass_uuid")
      .eq("wedding_id", organizer.wedding_id);

    const groupMap = new Map();
    (groups || []).forEach((g) => groupMap.set(g.id, g));

    const groupIds = (groups || []).map((g) => g.id);

    let allGuests: Guest[] = [];
    if (groupIds.length > 0) {
      const { data: guestsData } = await supabase
        .from("guests")
        .select("*")
        .in("group_id", groupIds)
        .order("last_name");

      allGuests = (guestsData || []).map((g) => ({
        ...g,
        group: groupMap.get(g.group_id) || { name: "Grupo familiar", table_number: 0 },
      }));
    }

    setGuests(allGuests);

    const tableSet = new Set(
      (groups || []).filter((g) => g.table_number).map((g) => g.table_number)
    );
    setActiveTables(tableSet.size);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Contadores derivados de la lista (se actualizan con realtime)
  const totalGuests = guests.length;
  const arrived = guests.filter((g) => g.status === "checked_in").length;
  const pendingCount = guests.filter((g) => g.status === "pending").length;

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const percentage = totalGuests > 0 ? Math.round((arrived / totalGuests) * 100) : 0;

  // Realtime: check-ins en vivo desde cualquier dispositivo
  useEffect(() => {
    const channel = supabase
      .channel("guests-rt")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "guests" },
        (payload: { new: Partial<Guest> & { id: string } }) => {
          const next = payload.new;
          setGuests((prev) =>
            prev.some((g) => g.id === next.id)
              ? prev.map((g) => (g.id === next.id ? { ...g, ...next, group: g.group } : g))
              : prev
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "guests" },
        () => { fetchData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchData]);

  useEffect(() => { setPage(1); }, [searchQuery, activeFilter]);

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch =
      searchQuery === "" ||
      `${guest.first_name} ${guest.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      guest.group?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "Todos" ||
      (activeFilter === "Confirmados" && guest.status === "confirmed") ||
      (activeFilter === "Pendientes" && guest.status === "pending");

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredGuests.length / ITEMS_PER_PAGE);
  const paginatedGuests = filteredGuests.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function handleEditClick(guest: Guest) {
    setEditingGuest(guest);
    setShowEditModal(true);
  }

  function handleDeleteClick(guest: Guest) {
    setDeletingGuest(guest);
    setShowDeleteConfirm(true);
  }

  function handleQRClick(guest: Guest) {
    if (guest.group?.pass_uuid) {
      window.open(`/pase/${guest.group.pass_uuid}`, "_blank");
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingGuest) return;

    setDeleteLoading(true);

    try {
      await supabase
        .from("guests")
        .delete()
        .eq("id", deletingGuest.id);

      setShowDeleteConfirm(false);
      setDeletingGuest(null);
      fetchData();
    } catch {
      setDeleteLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleExportCsv() {
    const csvData = guests.map((g) => ({
      Nombre: g.first_name,
      Apellido: g.last_name,
      Grupo: g.group.name,
      Mesa: g.group.table_number,
      Estado: g.status === "checked_in" ? "Llego" : g.status === "confirmed" ? "Confirmado" : "Pendiente",
      Telefono: g.phone || "",
      Email: g.email || "",
    }));

    exportToCsv(csvData, `attendapp-padron-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="min-h-screen bg-surface pb-28">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header id="tour-header" className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between border-b border-line-strong/70">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-ink text-gold flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold">
                {coupleName}
              </p>
              <h1 className="font-serif text-xl leading-none text-content">Attendapp</h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => startTour(true)}
              className="w-10 h-10 rounded-full bg-card border border-line-strong flex items-center justify-center text-muted shadow-card hover:bg-field transition-colors"
              title="Mostrar tutorial"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
            <Link
              href="/ajustes"
              className="w-10 h-10 rounded-full bg-card border border-line-strong flex items-center justify-center text-muted shadow-card hover:bg-field transition-colors"
              title="Ajustes del evento"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
            <span id="tour-user-avatar"><UserAvatar name={coupleName} /></span>
          </div>
        </header>

        {/* Analytics */}
        <section id="tour-analytics" className="px-5 pt-5 pb-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg text-content">Resumen del dia</h2>
            <span className="text-xs text-muted font-medium">
              {currentTime}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl p-4 border border-line shadow-card flex items-center gap-3">
              <AnalyticsRing percentage={percentage} />
              <div>
                <p className="text-2xl font-bold text-content leading-none">
                  {arrived}
                  <span className="text-base text-muted-soft font-medium">/{totalGuests}</span>
                </p>
                <p className="text-xs text-muted mt-1 font-medium">Llegaron</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-4 border border-line shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-full bg-gold-faint text-gold-deep flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v2c0 1.1.9 2 2 2h4" />
                    <path d="M21 7v2c0 1.1-.9 2-2 2h-4" />
                    <rect x="5" y="7" width="14" height="10" rx="2" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-content leading-none mt-2">{activeTables} Mesas</p>
              <p className="text-xs text-muted font-medium">Activas</p>
            </div>

            <div className="bg-card rounded-2xl p-4 border border-line shadow-card flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div>
                <p className="text-2xl font-bold text-content leading-none">{pendingCount}</p>
                <p className="text-xs text-muted font-medium">Pendientes</p>
              </div>
            </div>

            <div className="bg-ink rounded-2xl p-4 shadow-lift dark:ring-1 dark:ring-gold/30 flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-white/10 text-gold flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </span>
              <div>
                <p className="text-2xl font-bold text-white leading-none">{activeTables}</p>
                <p className="text-xs text-muted-soft font-medium">Mesas activas</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section id="tour-actions" className="px-5 pt-5 pb-1">
          <div className="flex gap-3">
            <button
              onClick={handleExportCsv}
              disabled={guests.length === 0}
              className="flex-1 bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lift hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-card border border-line-strong text-content-soft rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-field transition-colors"
            >
              <svg className="w-4 h-4 text-sky" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Agregar
            </button>
          </div>
        </section>

        {/* Search & Filters */}
        <section id="tour-search" className="px-5 pt-4 pb-2 space-y-3">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o grupo familiar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-line-strong rounded-xl pl-11 pr-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20 shadow-card"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                  activeFilter === filter
                    ? "bg-ink text-white dark:bg-gold dark:text-ink"
                    : "bg-card border border-line-strong text-content-soft hover:bg-field"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {/* Guest List */}
        <section id="tour-guest-list" className="px-5 pt-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-lg text-content">Padron</h2>
            <span className="text-xs text-muted font-medium">
              {totalGuests} invitados
            </span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-soft text-sm">Cargando invitados...</div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-field flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <p className="text-sm font-medium text-content-soft">No hay invitados</p>
              <p className="text-xs text-muted-soft mt-1">
                Agrega tu primer invitado para empezar
              </p>
            </div>
          ) : (
            paginatedGuests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                onQRClick={() => handleQRClick(guest)}
                onEditClick={() => handleEditClick(guest)}
                onDeleteClick={() => handleDeleteClick(guest)}
              />
            ))
          )}

          {/* Pagination */}
          {!loading && filteredGuests.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-2 pb-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-content-soft bg-card border border-line-strong rounded-lg shadow-card disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Anterior
              </button>
              <span className="text-xs text-muted dark:text-muted-soft font-medium">
                {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, filteredGuests.length)} de {filteredGuests.length}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-content-soft bg-card border border-line-strong rounded-lg shadow-card disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </section>
      </div>

      <div id="tour-nav"><BottomNav /></div>

      {weddingId && (
        <AddGuestModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onGuestAdded={fetchData}
          weddingId={weddingId}
        />
      )}

      <EditGuestModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingGuest(null); }}
        onGuestUpdated={fetchData}
        guest={editingGuest}
      />

      <DeleteConfirm
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeletingGuest(null); }}
        onConfirm={handleDeleteConfirm}
        guestName={deletingGuest ? `${deletingGuest.first_name} ${deletingGuest.last_name}` : ""}
        loading={deleteLoading}
      />
    </div>
  );
}
