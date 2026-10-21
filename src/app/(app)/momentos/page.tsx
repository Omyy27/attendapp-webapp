"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/use-supabase";
import { canManageEvent } from "@/lib/roles";
import { Toast } from "@/components/ui/toast";
import { formatClock, formatDay } from "@/components/moments/format";

const PHOTO_BUCKET = "event-photos";
const tabs = ["Fotos", "Mensajes"] as const;

interface PhotoRow {
  id: string;
  author_name: string;
  path: string;
  thumb_path: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

type Pending = { type: "photo" | "message" | "all"; id: string; label: string };

export default function MomentosAdminPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Fotos");
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const publicUrl = useCallback(
    (path: string) => supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl,
    [supabase]
  );

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: organizer } = await supabase
      .from("organizers")
      .select("wedding_id, role")
      .eq("user_id", user.id)
      .single();
    if (!organizer?.wedding_id) { setLoading(false); return; }
    if (!canManageEvent(organizer.role)) { router.replace("/"); return; }

    // RLS ya limita las filas al evento del organizador
    const [w, p, m] = await Promise.all([
      supabase.from("weddings").select("*").eq("id", organizer.wedding_id).single(),
      supabase
        .from("event_photos")
        .select("id, author_name, path, thumb_path, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("chat_messages")
        .select("id, author_name, body, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setEnabled(w.data && "moments_enabled" in w.data ? !!w.data.moments_enabled : null);
    setPhotos((p.data as PhotoRow[]) || []);
    setMessages((m.data as MessageRow[]) || []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function handleDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/moments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: confirm.type, id: confirm.id }),
      });
      if (!res.ok) throw new Error();
      if (confirm.type === "all") {
        setPhotos([]);
        setMessages([]);
        setToast("Momentos reiniciado");
      } else if (confirm.type === "photo") {
        setPhotos((prev) => prev.filter((x) => x.id !== confirm.id));
        setToast("Foto eliminada");
      } else {
        setMessages((prev) => prev.filter((x) => x.id !== confirm.id));
        setToast("Mensaje eliminado");
      }
      setConfirm(null);
    } catch {
      setToast("No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface pb-28 md:pb-10">
      <div className="max-w-md md:max-w-3xl mx-auto min-h-screen">
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md px-5 md:px-8 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4 border-b border-line-strong/70">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">Invitados</p>
              <h1 className="font-serif text-lg leading-none text-content">Momentos</h1>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="w-9 h-9 rounded-full bg-card border border-line-strong flex items-center justify-center text-muted shadow-card shrink-0"
              aria-label="Actualizar"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                  tab === t
                    ? "bg-ink text-white dark:bg-gold dark:text-ink"
                    : "bg-card border border-line-strong text-content-soft hover:bg-field"
                }`}
              >
                {t} · {t === "Fotos" ? photos.length : messages.length}
              </button>
            ))}
          </div>
        </header>

        {enabled === false && !loading && (
          <p className="mx-5 md:mx-8 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Momentos está desactivado: los invitados no ven el botón. Actívalo en Ajustes.
          </p>
        )}
        {enabled === null && !loading && (
          <p className="mx-5 md:mx-8 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            Falta ejecutar la migración 009_moments.sql en Supabase.
          </p>
        )}

        <section className="px-5 md:px-8 pt-4">
          {loading ? (
            <div className="text-center py-10 text-muted-soft text-sm">Cargando momentos...</div>
          ) : tab === "Fotos" ? (
            photos.length === 0 ? (
              <EmptyState text="Aún no hay fotos de los invitados" />
            ) : (
              <ul className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {photos.map((p) => (
                  <li key={p.id} className="relative group">
                    <a href={publicUrl(p.path)} target="_blank" rel="noopener" className="block aspect-square overflow-hidden rounded-xl bg-field">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={publicUrl(p.thumb_path)} alt={`Foto de ${p.author_name}`} loading="lazy" className="h-full w-full object-cover" />
                    </a>
                    <p className="mt-1 text-[10px] leading-tight text-muted truncate">
                      {p.author_name} · {formatClock(p.created_at)}
                    </p>
                    <button
                      onClick={() => setConfirm({ type: "photo", id: p.id, label: `la foto de ${p.author_name}` })}
                      className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-rose-600"
                      aria-label="Eliminar foto"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : messages.length === 0 ? (
            <EmptyState text="Aún no hay mensajes en el chat" />
          ) : (
            <ul className="space-y-2">
              {messages.map((m) => (
                <li key={m.id} className="bg-card rounded-xl border border-line p-3 shadow-card flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-content">
                      {m.author_name}
                      <span className="ml-2 font-normal text-muted-soft">
                        {formatDay(m.created_at)} · {formatClock(m.created_at)}
                      </span>
                    </p>
                    <p className="text-sm text-content-soft mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                  <button
                    onClick={() => setConfirm({ type: "message", id: m.id, label: `el mensaje de ${m.author_name}` })}
                    className="w-8 h-8 shrink-0 rounded-full text-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 flex items-center justify-center"
                    aria-label="Eliminar mensaje"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Zona de riesgo: dejar Momentos vacío (p. ej. después de probar) */}
        {!loading && (
          <section className="px-5 md:px-8 pt-10">
            <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 p-4">
              <p className="text-sm font-semibold text-content">Reiniciar Momentos</p>
              <p className="text-[11px] text-muted-soft mt-0.5 leading-relaxed">
                Borra todas las fotos, mensajes y me gusta del evento. Útil para limpiar lo que subiste de prueba.
              </p>
              <button
                onClick={() =>
                  setConfirm({
                    type: "all",
                    id: "",
                    label: `${photos.length} ${photos.length === 1 ? "foto" : "fotos"}, ${messages.length} ${
                      messages.length === 1 ? "mensaje" : "mensajes"
                    } y todos los me gusta`,
                  })
                }
                disabled={photos.length === 0 && messages.length === 0}
                className="mt-3 rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10 transition-colors disabled:opacity-40"
              >
                Reiniciar Momentos
              </button>
            </div>
          </section>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="absolute inset-0" onClick={() => !deleting && setConfirm(null)} />
          <div className="relative bg-card rounded-2xl shadow-lift p-6 max-w-sm w-full text-center">
            <h3 className="font-serif text-lg text-content mb-2">
              {confirm.type === "all"
                ? "Reiniciar Momentos"
                : confirm.type === "photo"
                  ? "Eliminar foto"
                  : "Eliminar mensaje"}
            </h3>
            <p className="text-sm text-muted mb-6">
              {confirm.type === "all" ? "Se borrarán" : "Se eliminará"} {confirm.label} para todos los invitados. Esta
              acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={deleting}
                className="flex-1 bg-field text-content-soft rounded-xl py-3 text-sm font-semibold hover:bg-line-strong/60 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-rose-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : confirm.type === "all" ? "Reiniciar" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10">
      <div className="w-16 h-16 rounded-full bg-field flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-muted-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      </div>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
