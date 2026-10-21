"use client";

import type { EventPhoto } from "@/lib/types";
import { CameraPlusIcon, HeartIcon } from "./icons";

interface MomentsGalleryProps {
  photos: EventPhoto[];
  likes: Record<string, number>;
  /** Fotos que se están subiendo desde este dispositivo */
  uploading: number;
  onOpen: (index: number) => void;
  onAdd: () => void;
}

export function MomentsGallery({ photos, likes, uploading, onOpen, onAdd }: MomentsGalleryProps) {
  return (
    <section className="px-5 pt-5 pb-5 border-b border-slate-100 bg-white">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-serif text-xl text-ink">Galería</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Fotos compartidas por los invitados</p>
        </div>
        {photos.length > 0 && (
          <span className="text-[11px] font-semibold text-gold-deep bg-gold-faint px-2.5 py-1 rounded-full">
            {photos.length} {photos.length === 1 ? "foto" : "fotos"}
          </span>
        )}
      </div>

      <ul className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
        <li className="shrink-0">
          <button
            type="button"
            onClick={onAdd}
            disabled={uploading > 0}
            className="w-24 h-28 rounded-2xl border-2 border-dashed border-gold/50 bg-gold-faint text-gold-deep flex flex-col items-center justify-center gap-1.5 hover:bg-gold/10 transition-colors disabled:opacity-60"
          >
            <CameraPlusIcon className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Subir foto</span>
          </button>
        </li>
        {Array.from({ length: uploading }, (_, i) => (
          <li key={`up-${i}`} className="shrink-0 w-24 h-28 rounded-2xl bg-gold-faint animate-pulse" aria-label="Subiendo foto" />
        ))}
        {photos.map((photo, i) => (
          <li key={photo.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onOpen(i)}
              className="relative block w-24 h-28 rounded-2xl overflow-hidden shadow-card bg-slate-100"
              aria-label={`Foto de ${photo.author_name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumb_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              {!!likes[photo.id] && (
                <span className="absolute bottom-1.5 right-1.5 bg-ink/70 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <HeartIcon filled className="w-2.5 h-2.5 text-gold" />
                  {likes[photo.id]}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {photos.length === 0 && uploading === 0 && (
        <p className="mt-3 text-xs text-slate-500">Sé el primero en compartir una foto del evento.</p>
      )}
    </section>
  );
}
