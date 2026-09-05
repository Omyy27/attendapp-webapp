"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/ui/bottom-nav";
import { Toast } from "@/components/ui/toast";
import { DispatchCard, type GuestGroup } from "@/components/dispatch-card";
import { useDriverTour } from "@/lib/use-driver-tour";
import { UserAvatar } from "@/components/user-avatar";

const pasesSteps = [
  { element: "#tour-pases-status", popover: { title: "Estado de envíos", description: "Pases generados, enviados y por enviar en tiempo real." } },
  { element: "#tour-pases-explainer", popover: { title: "¿Cómo funciona?", description: "Cada grupo familiar recibe un enlace único a su Invitación, sin archivos pesados." } },
  { element: "#tour-pases-send-all", popover: { title: "Envío masivo", description: "Envía todos los pases pendientes de una sola vez." } },
  { element: "#tour-pases-list", popover: { title: "Cola de despacho", description: "Envía por WhatsApp, correo o copia el link directamente." } },
  { element: "#tour-pases-nav", popover: { title: "Navegación", description: "Cambia entre secciones desde la barra inferior." } },
];

export default function PassesPage() {
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizerName, setOrganizerName] = useState("");
  const [coupleName, setCoupleName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { startTour } = useDriverTour("pases", pasesSteps);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [startTour]);

  const fetchGroups = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: organizer } = await supabase
      .from("organizers")
      .select("wedding_id, name, role")
      .eq("user_id", user.id)
      .single();

    if (organizer?.name) setOrganizerName(organizer.name);

    // Los porteros no acceden a pases
    if (organizer?.role === "scanner") {
      router.replace("/");
      return;
    }

    if (!organizer?.wedding_id) { setLoading(false); return; }

    const { data: wedding } = await supabase
      .from("weddings")
      .select("couple_name")
      .eq("id", organizer.wedding_id)
      .single();

    if (wedding?.couple_name) setCoupleName(wedding.couple_name);

    const { data: groupsData } = await supabase
      .from("guest_groups")
      .select("*")
      .eq("wedding_id", organizer.wedding_id)
      .order("name");

    if (!groupsData) { setLoading(false); return; }

    const groupsWithCount = await Promise.all(
      groupsData.map(async (g) => {
        const { count } = await supabase
          .from("guests")
          .select("*", { count: "exact", head: true })
          .eq("group_id", g.id);

        return {
          ...g,
          guest_count: count || 0,
        };
      })
    );

    setGroups(groupsWithCount as GuestGroup[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const emitted = groups.length;
  const delivered = groups.filter((g) => g.pass_sent).length;
  const inQueue = groups.filter((g) => !g.pass_sent).length;

  async function handleMarkSent(groupId: string, via: "whatsapp" | "email" | "link"): Promise<boolean> {
    const sentAt = new Date().toISOString();
    const { error } = await supabase
      .from("guest_groups")
      .update({
        pass_sent: true,
        pass_sent_via: via,
        pass_sent_at: sentAt,
      })
      .eq("id", groupId);

    if (error) {
      // Respaldo: recarga silenciosa si el update falló
      fetchGroups({ silent: true });
      return false;
    }
    // Optimista: parchear en memoria sin recargar la lista
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, pass_sent: true, pass_sent_via: via, pass_sent_at: sentAt } : g
      )
    );
    return true;
  }

  async function handleResend(group: GuestGroup) {
    const ok = await handleMarkSent(group.id, group.pass_sent_via || "link");
    if (ok) showToast("Invitación reenviada");
  }

  async function handleWhatsApp(group: GuestGroup) {
    const url = `${window.location.origin}/pase/${group.pass_uuid}`;
    const message = `¡Hola! ${coupleName || "Te invitamos a nuestra boda"} 💍\nConfirma tu asistencia y ve tu invitación aquí:\n${url}`;

    // Intentar abrir el chat directo con el primer teléfono del grupo
    let phone: string | null = null;
    try {
      const { data } = await supabase
        .from("guests")
        .select("phone")
        .eq("group_id", group.id)
        .not("phone", "is", null)
        .limit(5);
      const digits = (data || [])
        .map((g) => (g.phone || "").replace(/\D/g, ""))
        .find((d) => d.length >= 10);
      if (digits) phone = digits;
    } catch {
      // Sin teléfono: se abre el selector de contactos
    }

    window.open(
      `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    await handleMarkSent(group.id, "whatsapp");
  }

  async function handleEmail(group: GuestGroup) {
    try {
      const res = await fetch("/api/dispatch/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "No se pudo enviar el correo");
        return;
      }

      showToast(
        data.total > 1
          ? `Invitación enviada a ${data.sent} correos`
          : "Invitación enviada por correo"
      );
      await handleMarkSent(group.id, "email");
    } catch {
      showToast("No se pudo enviar el correo");
    }
  }

  async function handleCopyLink(group: GuestGroup) {
    const url = `${window.location.origin}/pase/${group.pass_uuid}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Enlace de invitación copiado");
    } catch {
      showToast("No se pudo copiar el enlace");
      return;
    }
    await handleMarkSent(group.id, "link");
  }

  async function handleDispatchAll() {
    const pendingIds = groups.filter((g) => !g.pass_sent).map((g) => g.id);
    if (pendingIds.length === 0) return;

    const sentAt = new Date().toISOString();
    const { error } = await supabase
      .from("guest_groups")
      .update({ pass_sent: true, pass_sent_via: "link", pass_sent_at: sentAt })
      .in("id", pendingIds);

    if (error) {
      fetchGroups({ silent: true });
    } else {
      // Optimista: marcar todos en memoria sin recargar la lista
      setGroups((prev) =>
        prev.map((g) =>
          pendingIds.includes(g.id)
            ? { ...g, pass_sent: true, pass_sent_via: "link" as const, pass_sent_at: sentAt }
            : g
        )
      );
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-28">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between border-b border-line-strong/70">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-ink text-gold flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted font-semibold">
                Envío de invitaciones
              </p>
              <h1 className="font-serif text-xl leading-none text-content">Enviar pases</h1>
            </div>
          </div>
          <UserAvatar name={organizerName} />
        </header>

        {/* Status Strip */}
        <section id="tour-pases-status" className="px-5 pt-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl p-3.5 border border-line shadow-card text-center">
              <p className="text-xl font-bold text-content leading-none">{emitted}</p>
              <p className="text-[11px] text-muted font-medium mt-1">Generados</p>
            </div>
            <div className="bg-card rounded-2xl p-3.5 border border-line shadow-card text-center">
              <p className="text-xl font-bold text-emerald-600 leading-none">{delivered}</p>
              <p className="text-[11px] text-muted font-medium mt-1">Enviados</p>
            </div>
            <div className="bg-ink rounded-2xl p-3.5 shadow-lift text-center dark:ring-1 dark:ring-gold/30">
              <p className="text-xl font-bold text-gold leading-none">{inQueue}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Por enviar</p>
            </div>
          </div>
        </section>

        {/* Explainer */}
        <section id="tour-pases-explainer" className="px-5 pt-5">
          <div className="bg-card rounded-2xl border border-line shadow-card p-4 flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </span>
            <p className="text-xs text-muted leading-relaxed">
              <span className="font-semibold text-content">Sin archivos pesados.</span> Cada grupo familiar
              recibe un UUID unico encriptado y un link magico a su Invitación — enviado directo
              por WhatsApp o correo, sin adjuntos que pesen.
            </p>
          </div>
        </section>

        {/* Bulk Actions */}
        <section id="tour-pases-send-all" className="px-5 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg text-content">Pendientes</h2>
            <span className="text-xs text-muted font-medium">
              {inQueue} grupos pendientes
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDispatchAll}
              disabled={inQueue === 0}
              className="flex-1 bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lift hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 2v11h3v9l7-12h-4l4-8z" />
              </svg>
              Enviar todos
            </button>
          </div>
        </section>

        {/* Dispatch List */}
        <section id="tour-pases-list" className="px-5 pt-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-muted-soft text-sm">Cargando grupos...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-field flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 9a3 3 0 0 1 0 6v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a3 3 0 0 1 0-6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-content-soft">No hay grupos</p>
              <p className="text-xs text-muted-soft mt-1">
                Crea grupos de invitados en el padron primero
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <DispatchCard
                key={group.id}
                group={group}
                onWhatsApp={() => handleWhatsApp(group)}
                onEmail={() => handleEmail(group)}
                onCopyLink={() => handleCopyLink(group)}
                onResend={() => handleResend(group)}
              />
            ))
          )}
        </section>

        {/* Security Note */}
        <section className="px-5 pt-2">
          <div className="flex items-center gap-2.5 text-muted-soft text-[11px] justify-center py-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Cada enlace expira y se invalida tras el primer escaneo valido
          </div>
        </section>
      </div>

      <div id="tour-pases-nav"><BottomNav /></div>

      <Toast message={toast} />
    </div>
  );
}
