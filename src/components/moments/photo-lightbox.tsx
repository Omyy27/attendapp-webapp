"use client";

import { useEffect, useRef, useState } from "react";
import type { EventPhoto } from "@/lib/types";
import { formatClock } from "./format";
import { DownloadIcon, HeartIcon } from "./icons";

interface PhotoLightboxProps {
  photos: EventPhoto[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  likes: Record<string, number>;
  myLikes: Set<string>;
  onToggleLike: (photoId: string) => void;
}

const SWIPE_PX = 50;

export function PhotoLightbox({ photos, index, onIndex, onClose, likes, myLikes, onToggleLike }: PhotoLightboxProps) {
  const photo = photos[index];
  const touchX = useRef<number | null>(null);
  const [saving, setSaving] = useState(false);
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onIndex(index - 1);
      if (e.key === "ArrowRight" && hasNext) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, hasPrev, hasNext, onIndex, onClose]);

  // La foto pudo ser borrada por el organizador mientras estaba abierta
  useEffect(() => {
    if (!photo) onClose();
  }, [photo, onClose]);
  if (!photo) return null;

  async function handleDownload() {
    setSaving(true);
    try {
      const res = await fetch(photo.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `momento-${photo.id.slice(0, 8)}.${blob.type === "image/jpeg" ? "jpg" : "webp"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(photo.url, "_blank", "noopener");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx > SWIPE_PX && hasPrev) onIndex(index - 1);
        if (dx < -SWIPE_PX && hasNext) onIndex(index + 1);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 text-white">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{photo.author_name}</p>
          <p className="text-[11px] text-white/60">{formatClock(photo.created_at)} · {index + 1} de {photos.length}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleLike(photo.id)}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 hover:bg-white/10"
            aria-pressed={myLikes.has(photo.id)}
            aria-label={myLikes.has(photo.id) ? "Quitar me gusta" : "Me gusta"}
          >
            <HeartIcon filled={myLikes.has(photo.id)} className={`w-5 h-5 ${myLikes.has(photo.id) ? "text-gold" : ""}`} />
            {!!likes[photo.id] && <span className="text-sm font-semibold">{likes[photo.id]}</span>}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={saving}
            className="rounded-full p-2.5 hover:bg-white/10 disabled:opacity-50"
            aria-label="Descargar foto"
          >
            <DownloadIcon className="w-5 h-5" />
          </button>
          <button type="button" onClick={onClose} className="rounded-full p-2.5 hover:bg-white/10" aria-label="Cerrar">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={`Foto de ${photo.author_name}`}
          className="max-h-full max-w-full object-contain"
          onDoubleClick={() => !myLikes.has(photo.id) && onToggleLike(photo.id)}
        />
        {hasPrev && (
          <NavButton side="left" onClick={() => onIndex(index - 1)} />
        )}
        {hasNext && (
          <NavButton side="right" onClick={() => onIndex(index + 1)} />
        )}
      </div>
    </div>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hidden sm:flex absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-3" : "right-3"} h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20`}
      aria-label={side === "left" ? "Foto anterior" : "Foto siguiente"}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d={side === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  );
}
