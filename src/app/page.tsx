"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/ui/bottom-nav";
import { AnalyticsRing } from "@/components/analytics-ring";
import { GuestCard, type Guest } from "@/components/guest-card";
import { AddGuestModal } from "@/components/add-guest-modal";
import { EditGuestModal } from "@/components/edit-guest-modal";
import { DeleteConfirm } from "@/components/delete-confirm";
import { exportToCsv } from "@/lib/csv";

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

  const [totalGuests, setTotalGuests] = useState(0);
  const [arrived, setArrived] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeTables, setActiveTables] = useState(0);
  const [coupleName, setCoupleName] = useState("Mi evento");
  const [currentTime, setCurrentTime] = useState("");

  const supabase = createClient();

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
      .select("id, name, table_number")
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
    setTotalGuests(allGuests.length);
    setArrived(allGuests.filter((g) => g.status === "checked_in").length);
    setPendingCount(allGuests.filter((g) => g.status === "pending").length);

    const tableSet = new Set(
      (groups || []).filter((g) => g.table_number).map((g) => g.table_number)
    );
    setActiveTables(tableSet.size);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const percentage = totalGuests > 0 ? Math.round((arrived / totalGuests) * 100) : 0;

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

  function handleEditClick(guest: Guest) {
    setEditingGuest(guest);
    setShowEditModal(true);
  }

  function handleDeleteClick(guest: Guest) {
    setDeletingGuest(guest);
    setShowDeleteConfirm(true);
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
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-ink text-gold flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                {coupleName}
              </p>
              <h1 className="font-serif text-xl leading-none text-ink">Attendapp</h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 relative shadow-card">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-sky" />
            </button>
          </div>
        </header>

        {/* Analytics */}
        <section className="px-5 pt-5 pb-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg text-ink">Resumen del dia</h2>
            <span className="text-xs text-slate-500 font-medium">
              {currentTime}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center gap-3">
              <AnalyticsRing percentage={percentage} />
              <div>
                <p className="text-2xl font-bold text-ink leading-none">
                  {arrived}
                  <span className="text-base text-slate-400 font-medium">/{totalGuests}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 font-medium">Llegaron</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-full bg-gold-faint text-gold-deep flex items-center justify-center">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v2c0 1.1.9 2 2 2h4" />
                    <path d="M21 7v2c0 1.1-.9 2-2 2h-4" />
                    <rect x="5" y="7" width="14" height="10" rx="2" />
                  </svg>
                </span>
              </div>
              <p className="text-2xl font-bold text-ink leading-none mt-2">{activeTables} Mesas</p>
              <p className="text-xs text-slate-500 font-medium">Activas</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <div>
                <p className="text-2xl font-bold text-ink leading-none">{pendingCount}</p>
                <p className="text-xs text-slate-500 font-medium">Pendientes</p>
              </div>
            </div>

            <div className="bg-ink rounded-2xl p-4 shadow-lift flex items-center gap-3">
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
                <p className="text-xs text-slate-400 font-medium">Mesas activas</p>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="px-5 pt-5 pb-1">
          <div className="flex gap-3">
            <button
              onClick={handleExportCsv}
              disabled={guests.length === 0}
              className="flex-1 bg-ink text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lift hover:bg-ink-light transition-colors disabled:opacity-50"
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
              className="bg-white border border-slate-200 text-slate-700 rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-slate-50 transition-colors"
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
        <section className="px-5 pt-4 pb-2 space-y-3">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o grupo familiar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20 shadow-card"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                  activeFilter === filter
                    ? "bg-ink text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        {/* Guest List */}
        <section className="px-5 pt-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-serif text-lg text-ink">Padron</h2>
            <span className="text-xs text-slate-500 font-medium">
              {totalGuests} invitados
            </span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Cargando invitados...</div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">No hay invitados</p>
              <p className="text-xs text-slate-400 mt-1">
                Agrega tu primer invitado para empezar
              </p>
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <GuestCard
                key={guest.id}
                guest={guest}
                onEditClick={() => handleEditClick(guest)}
                onDeleteClick={() => handleDeleteClick(guest)}
              />
            ))
          )}
        </section>
      </div>

      <BottomNav />

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
