"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DispatchCard, type GuestGroup } from "@/components/dispatch-card";

export default function PassesPage() {
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchGroups = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: organizer } = await supabase
      .from("organizers")
      .select("wedding_id")
      .eq("user_id", user.id)
      .single();

    if (!organizer?.wedding_id) { setLoading(false); return; }

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

  async function handleMarkSent(groupId: string, via: "whatsapp" | "email" | "link") {
    await supabase
      .from("guest_groups")
      .update({
        pass_sent: true,
        pass_sent_via: via,
        pass_sent_at: new Date().toISOString(),
      })
      .eq("id", groupId);

    fetchGroups();
  }

  async function handleCopyLink(group: GuestGroup) {
    const url = `${window.location.origin}/pase/${group.pass_uuid}`;
    await navigator.clipboard.writeText(url);
    await handleMarkSent(group.id, "link");
  }

  async function handleDispatchAll() {
    for (const group of groups) {
      if (!group.pass_sent) {
        await handleMarkSent(group.id, "link");
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-ink text-gold flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                Modulo backend
              </p>
              <h1 className="font-serif text-xl leading-none text-ink">El Despachador</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-card">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
        </header>

        {/* Status Strip */}
        <section className="px-5 pt-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-card text-center">
              <p className="text-xl font-bold text-ink leading-none">{emitted}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Pases emitidos</p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-card text-center">
              <p className="text-xl font-bold text-emerald-600 leading-none">{delivered}</p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">Entregados</p>
            </div>
            <div className="bg-ink rounded-2xl p-3.5 shadow-lift text-center">
              <p className="text-xl font-bold text-gold leading-none">{inQueue}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">En cola</p>
            </div>
          </div>
        </section>

        {/* Explainer */}
        <section className="px-5 pt-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
              </svg>
            </span>
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-ink">Cero PDFs.</span> Cada grupo familiar
              recibe un UUID unico encriptado y un link magico a su Pase VIP — enviado directo
              por WhatsApp o correo, sin adjuntos que pesen.
            </p>
          </div>
        </section>

        {/* Bulk Actions */}
        <section className="px-5 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg text-ink">Cola de despacho</h2>
            <span className="text-xs text-slate-500 font-medium">
              {inQueue} grupos pendientes
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDispatchAll}
              disabled={inQueue === 0}
              className="flex-1 bg-ink text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-lift hover:bg-ink-light transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-gold" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 2v11h3v9l7-12h-4l4-8z" />
              </svg>
              Despachar todos
            </button>
          </div>
        </section>

        {/* Dispatch List */}
        <section className="px-5 pt-4 space-y-3">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Cargando grupos...</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 9a3 3 0 0 1 0 6v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a3 3 0 0 1 0-6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600">No hay grupos</p>
              <p className="text-xs text-slate-400 mt-1">
                Crea grupos de invitados en el padron primero
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <DispatchCard
                key={group.id}
                group={group}
                onWhatsApp={() => handleMarkSent(group.id, "whatsapp")}
                onEmail={() => handleMarkSent(group.id, "email")}
                onCopyLink={() => handleCopyLink(group)}
                onResend={() => handleMarkSent(group.id, group.pass_sent_via as "whatsapp" | "email" | "link" || "link")}
              />
            ))
          )}
        </section>

        {/* Security Note */}
        <section className="px-5 pt-2">
          <div className="flex items-center gap-2.5 text-slate-400 text-[11px] justify-center py-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Cada enlace expira y se invalida tras el primer escaneo valido
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
