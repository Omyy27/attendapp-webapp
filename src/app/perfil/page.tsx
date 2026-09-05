"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/user-avatar";
import { DarkToggle } from "@/components/dark-toggle";
import { InstallPrompt } from "@/components/install-prompt";
import { PushPrompt } from "@/components/push-prompt";
import type { Organizer, Wedding } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: org } = await supabase
      .from("organizers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    setOrganizer(org);

    if (org?.wedding_id) {
      const { data: w } = await supabase
        .from("weddings")
        .select("*")
        .eq("id", org.wedding_id)
        .single();
      setWedding(w);
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-muted-soft text-sm">Cargando perfil...</p>
      </div>
    );
  }

  const eventDate = wedding?.event_date
    ? new Date(wedding.event_date).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Por definir";

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
          <h1 className="font-serif text-lg text-content">Perfil</h1>
          <span className="w-16" />
        </header>

        <div className="px-5 pt-8 space-y-6">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-3">
            <UserAvatar name={organizer?.name || ""} size="md" />
            <div className="text-center">
              <h2 className="font-serif text-xl text-content font-bold">{organizer?.name}</h2>
              <p className="text-sm text-muted">{organizer?.email}</p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="space-y-3">
            <div className="bg-card rounded-2xl border border-line shadow-card p-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gold-faint text-gold-deep flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold">Pareja</p>
                  <p className="text-content font-semibold text-sm">{wedding?.couple_name || "Por definir"}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-line shadow-card p-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold">Rol</p>
                  <p className="text-content font-semibold text-sm">
                    {organizer?.role === "scanner" ? "Portero" : "Organizador"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-line shadow-card p-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold">Fecha del evento</p>
                  <p className="text-content font-semibold text-sm">{eventDate}</p>
                </div>
              </div>
            </div>

            {wedding?.venue_name && (
              <div className="bg-card rounded-2xl border border-line shadow-card p-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold">Lugar</p>
                    <p className="text-content font-semibold text-sm">{wedding.venue_name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <div className="bg-card rounded-2xl border border-line shadow-card p-4">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold mb-3">Apariencia</p>
            <DarkToggle />
          </div>

          {/* Install + Push */}
          <InstallPrompt />
          <PushPrompt />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full bg-card border border-rose-300/60 text-rose-600 dark:text-rose-400 rounded-2xl py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold shadow-card hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
