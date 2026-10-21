"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSupabase } from "@/lib/use-supabase";
import { compressPhoto } from "@/lib/image-compress";
import type { ChatMessage, EventPhoto } from "@/lib/types";
import { CoupleName } from "@/components/invitation/couple-name";
import { IdentityPicker, MomentsCard, type MomentsMember } from "@/components/moments/identity-picker";
import { MomentsGallery } from "@/components/moments/moments-gallery";
import { PhotoLightbox } from "@/components/moments/photo-lightbox";
import { ChatThread, type ThreadMessage, type TimelineItem } from "@/components/moments/chat-thread";
import { ChatComposer } from "@/components/moments/chat-composer";
import { ArrowLeftIcon, UsersIcon } from "@/components/moments/icons";

const PHOTO_BUCKET = "event-photos";
const MESSAGE_MAX = 500;
const POLL_MS = 4000;
// Cada tantas consultas se pide todo, para reflejar lo que borró el organizador
const FULL_REFRESH_EVERY = 8;

interface MomentsResponse {
  enabled: boolean;
  couple_name: string;
  /** El grupo tiene al menos un invitado confirmado */
  confirmed?: boolean;
  full?: boolean;
  members?: MomentsMember[];
  photos?: EventPhoto[];
  messages?: ChatMessage[];
  likes?: Record<string, number>;
  my_likes?: string[];
}

const byNewest = (a: { created_at: string }, b: { created_at: string }) =>
  b.created_at.localeCompare(a.created_at);

/** Une listas sin repetir ids; lo entrante reemplaza a lo existente */
function mergeById<T extends { id: string; created_at: string }>(prev: T[], incoming: T[], newestFirst: boolean) {
  if (incoming.length === 0) return prev;
  const map = new Map(prev.map((x) => [x.id, x]));
  for (const x of incoming) map.set(x.id, x);
  const list = [...map.values()].sort(byNewest);
  return newestFirst ? list : list.reverse();
}

const latest = (...lists: { created_at: string }[][]) =>
  lists.flat().reduce<string | null>((max, x) => (!max || x.created_at > max ? x.created_at : max), null);

const storageKey = (uuid: string) => `moments-guest-${uuid}`;
const readGuest = (uuid: string) => {
  try {
    return localStorage.getItem(storageKey(uuid));
  } catch {
    return null;
  }
};
const writeGuest = (uuid: string, id: string | null) => {
  try {
    if (id) localStorage.setItem(storageKey(uuid), id);
    else localStorage.removeItem(storageKey(uuid));
  } catch {}
};

export default function MomentsPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  const supabase = useSupabase();
  const [status, setStatus] = useState<"loading" | "ready" | "disabled" | "unconfirmed" | "error">("loading");
  const [coupleName, setCoupleName] = useState("");
  const [members, setMembers] = useState<MomentsMember[]>([]);
  // Integrante elegido en este dispositivo (el pase es de todo el grupo)
  const [pickedId, setPickedId] = useState<string | null>(() => readGuest(uuid));
  const [photos, setPhotos] = useState<EventPhoto[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(() => new Set());
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<string | null>(null);
  const pollCount = useRef(0);
  // "Me gusta" pendientes: estado deseado por foto, fotos con petición en curso
  // y un contador que invalida las consultas que salieron antes de un cambio
  const likeIntent = useRef(new Map<string, boolean>());
  const likeInFlight = useRef(new Set<string>());
  const likesVersion = useRef(0);

  const me = members.find((m) => m.id === pickedId) ?? (members.length === 1 ? members[0] : null);
  const meId = me?.id ?? null;

  // Igual que la invitación: siempre en modo claro
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("force-light");
    el.style.colorScheme = "light";
    return () => {
      el.classList.remove("force-light");
      el.style.colorScheme = "";
    };
  }, []);

  const applyResponse = useCallback((data: MomentsResponse, acceptLikes: boolean) => {
    setCoupleName(data.couple_name);
    if (!data.enabled) {
      setStatus("disabled");
      return;
    }
    if (!data.confirmed) {
      setStatus("unconfirmed");
      return;
    }
    const incomingPhotos = data.photos || [];
    const incomingMessages = data.messages || [];
    if (data.full) {
      setPhotos(incomingPhotos);
      // Se conservan los mensajes propios que aún se están enviando
      setMessages((prev) => [...incomingMessages, ...prev.filter((m) => m.pending)]);
    } else {
      setPhotos((prev) => mergeById(prev, incomingPhotos, true));
      setMessages((prev) => mergeById(prev, incomingMessages, false));
    }
    if (data.members) setMembers(data.members);
    // Con "me gusta" propios sin confirmar, el servidor puede traer el estado viejo
    if (acceptLikes) {
      setLikes(data.likes || {});
      setMyLikes(new Set(data.my_likes || []));
    }
    const newest = latest(incomingPhotos, incomingMessages);
    if (data.full || (newest && (!cursorRef.current || newest > cursorRef.current))) {
      cursorRef.current = newest ?? cursorRef.current;
    }
    setStatus("ready");
  }, []);

  const load = useCallback(
    async (full: boolean) => {
      const query = new URLSearchParams();
      if (!full && cursorRef.current) query.set("since", cursorRef.current);
      if (meId) query.set("guest", meId);
      // Si hubo un "me gusta" mientras viajaba la consulta, sus likes ya están viejos
      const likesVersionAtStart = likesVersion.current;
      const res = await fetch(`/api/pass/${uuid}/moments?${query}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      applyResponse(data, likesVersion.current === likesVersionAtStart && likeIntent.current.size === 0);
    },
    [uuid, meId, applyResponse]
  );

  // Carga inicial; se repite al elegir invitado para traer sus "me gusta"
  useEffect(() => {
    const run = async () => {
      try {
        await load(true);
      } catch {
        setStatus("error");
      }
    };
    run();
  }, [load]);

  // Polling mientras la pestaña está visible
  useEffect(() => {
    if (status !== "ready") return;
    const tick = () => {
      if (document.hidden) return;
      pollCount.current += 1;
      load(pollCount.current % FULL_REFRESH_EVERY === 0).catch(() => {});
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, load]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // Hilo: mensajes y fotos mezclados por hora
  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [
      ...messages.map((m) => ({
        kind: "message" as const,
        id: m.id,
        created_at: m.created_at,
        author_name: m.author_name,
        mine: !!meId && m.guest_id === meId,
        message: m,
      })),
      ...photos.map((p) => ({
        kind: "photo" as const,
        id: p.id,
        created_at: p.created_at,
        author_name: p.author_name,
        mine: !!meId && p.guest_id === meId,
        photo: p,
      })),
    ];
    return items.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [messages, photos, meId]);

  function pickMember(member: MomentsMember) {
    writeGuest(uuid, member.id);
    setPickedId(member.id);
  }

  const openPhoto = useCallback(
    (photoId: string) => {
      const index = photos.findIndex((p) => p.id === photoId);
      if (index >= 0) setLightbox(index);
    },
    [photos]
  );

  function toggleLike(photoId: string) {
    if (!me) return;
    // Lo pendiente manda sobre el estado pintado (clics seguidos antes de re-render)
    const liked = !(likeIntent.current.get(photoId) ?? myLikes.has(photoId));
    likeIntent.current.set(photoId, liked);
    likesVersion.current += 1;
    setMyLikes((prev) => {
      const next = new Set(prev);
      if (liked) next.add(photoId);
      else next.delete(photoId);
      return next;
    });
    setLikes((prev) => ({ ...prev, [photoId]: Math.max(0, (prev[photoId] || 0) + (liked ? 1 : -1)) }));
    syncLike(photoId, me.id);
  }

  /** Una petición a la vez por foto; si el invitado cambió de opinión mientras viajaba, se reenvía */
  async function syncLike(photoId: string, guestId: string) {
    if (likeInFlight.current.has(photoId)) return;
    likeInFlight.current.add(photoId);
    let sent = false;
    let count = 0;
    let failed = false;
    try {
      do {
        sent = likeIntent.current.get(photoId) ?? false;
        const res = await fetch(`/api/pass/${uuid}/moments/photos/${photoId}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId, liked: sent }),
        });
        if (!res.ok) throw new Error();
        count = (await res.json()).count;
      } while (likeIntent.current.get(photoId) !== sent);
    } catch {
      failed = true;
    }
    likeInFlight.current.delete(photoId);
    likeIntent.current.delete(photoId);
    likesVersion.current += 1;
    if (failed) {
      // No se sabe qué quedó guardado: se vuelve a leer el estado real
      setNotice("No se pudo guardar tu me gusta");
      load(false).catch(() => {});
      return;
    }
    setLikes((prev) => ({ ...prev, [photoId]: count }));
    setMyLikes((prev) => {
      const next = new Set(prev);
      if (sent) next.add(photoId);
      else next.delete(photoId);
      return next;
    });
  }

  async function sendMessage(body: string): Promise<boolean> {
    if (!me) return false;
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ThreadMessage = {
      id: tempId,
      guest_id: me.id,
      author_name: me.name,
      body,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`/api/pass/${uuid}/moments/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: me.id, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el mensaje");
      setMessages((prev) => mergeById(prev.filter((m) => m.id !== tempId), [data.message], false));
      return true;
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNotice(err instanceof Error ? err.message : "No se pudo enviar el mensaje");
      return false;
    }
  }

  async function uploadOne(file: File) {
    if (!me) return;
    const compressed = await compressPhoto(file);
    const post = async (path: string, payload: object) => {
      const res = await fetch(`/api/pass/${uuid}/moments/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: me.id, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo subir la foto");
      return data;
    };

    const target = await post("photos/upload-url", { ext: compressed.ext });
    const contentType = compressed.ext === "jpg" ? "image/jpeg" : "image/webp";
    const bucket = supabase.storage.from(PHOTO_BUCKET);
    const [full, thumb] = await Promise.all([
      bucket.uploadToSignedUrl(target.full.path, target.full.token, compressed.full, { contentType }),
      bucket.uploadToSignedUrl(target.thumb.path, target.thumb.token, compressed.thumb, { contentType }),
    ]);
    if (full.error || thumb.error) throw new Error("No se pudo subir la foto");

    const { photo } = await post("photos", {
      photoId: target.photoId,
      ext: target.ext,
      width: compressed.width,
      height: compressed.height,
    });
    setPhotos((prev) => mergeById(prev, [photo], true));
  }

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list || []).filter((f) => f.type.startsWith("image/") || f.name.match(/\.(heic|heif)$/i));
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setUploading(files.length);
    let failed = 0;
    let lastError = "";
    // Una a la vez: en el celular evita quedarse sin memoria con fotos grandes
    for (const file of files) {
      try {
        await uploadOne(file);
      } catch (err) {
        failed += 1;
        lastError = err instanceof Error ? err.message : "";
      }
      setUploading((n) => n - 1);
    }
    if (failed > 0) {
      setNotice(
        failed === files.length && lastError
          ? lastError
          : `No se pudieron subir ${failed} de ${files.length} fotos`
      );
    } else {
      setNotice(files.length === 1 ? "¡Foto compartida!" : `¡${files.length} fotos compartidas!`);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-dvh bg-[#fcfaf7] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold-deep animate-spin" aria-label="Cargando" />
      </div>
    );
  }

  if (status === "unconfirmed") {
    return (
      <MomentsCard coupleName={coupleName || undefined}>
        <p className="font-serif text-xl text-ink">Confirma tu asistencia</p>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Las fotos y mensajes del evento son para los invitados que confirmaron. Confirma desde tu invitación para unirte.
        </p>
        <Link
          href={`/pase/${uuid}`}
          className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-ink-light"
        >
          Ir a mi invitación
        </Link>
      </MomentsCard>
    );
  }

  if (status === "error" || status === "disabled") {
    return (
      <MomentsCard coupleName={coupleName || undefined}>
        <p className="font-serif text-xl text-ink">
          {status === "disabled" ? "Disponible pronto" : "No pudimos cargar esta página"}
        </p>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {status === "disabled"
            ? "Aquí podrás compartir fotos y mensajes durante el evento. Vuelve el gran día."
            : "Revisa tu conexión e intenta de nuevo."}
        </p>
        <Link
          href={`/pase/${uuid}`}
          className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lift hover:bg-ink-light"
        >
          Volver a la invitación
        </Link>
      </MomentsCard>
    );
  }

  if (!me) {
    return <IdentityPicker coupleName={coupleName} members={members} onPick={pickMember} />;
  }

  return (
    <div className="min-h-dvh bg-[#fcfaf7] text-ink">
      <div className="max-w-md mx-auto min-h-dvh relative pb-28">
        {/* Encabezado y galería quedan fijos; el chat se desplaza por debajo */}
        <div className="sticky top-0 z-30 shadow-card">
          <header className="bg-[#fcfaf7]/95 backdrop-blur-md border-b border-gold/20 px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-4 flex items-center gap-3">
            <Link
              href={`/pase/${uuid}`}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-ink shadow-card shrink-0"
              aria-label="Volver a la invitación"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
            <div className="flex-1 text-center min-w-0">
              <p className="text-[10px] uppercase tracking-[0.35em] text-gold-deep font-semibold">Momentos</p>
              <h1 className="font-script text-2xl text-ink leading-tight truncate">
                <CoupleName name={coupleName} />
              </h1>
            </div>
            {members.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  writeGuest(uuid, null);
                  setPickedId(null);
                }}
                className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-card shrink-0"
                aria-label={`Estás como ${me.name}. Cambiar de invitado`}
                title={`Estás como ${me.name}`}
              >
                <UsersIcon className="w-4 h-4" />
              </button>
            ) : (
              <span className="w-9 shrink-0" aria-hidden="true" />
            )}
          </header>

          <MomentsGallery
            photos={photos}
            likes={likes}
            uploading={uploading}
            onOpen={setLightbox}
            onAdd={() => fileRef.current?.click()}
          />
        </div>

        <main className="px-5 pt-5 pb-4">
          <ChatThread items={timeline} onOpenPhoto={openPhoto} />
        </main>

        <ChatComposer
          maxLength={MESSAGE_MAX}
          onSend={sendMessage}
          onAddPhotos={() => fileRef.current?.click()}
          uploading={uploading > 0}
          notice={uploading > 0 ? `Subiendo ${uploading} ${uploading === 1 ? "foto" : "fotos"}…` : notice}
        />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {lightbox !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightbox}
          onIndex={setLightbox}
          onClose={() => setLightbox(null)}
          likes={likes}
          myLikes={myLikes}
          onToggleLike={toggleLike}
        />
      )}
    </div>
  );
}
