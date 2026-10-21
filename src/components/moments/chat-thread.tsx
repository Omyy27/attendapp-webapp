"use client";

import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import type { ChatMessage, EventPhoto } from "@/lib/types";
import { authorTone, formatClock, formatDay, initials } from "./format";

export interface ThreadMessage extends ChatMessage {
  /** Enviado desde este dispositivo y aún sin respuesta del servidor */
  pending?: boolean;
}

/** El hilo mezcla mensajes y fotos subidas, ordenados por hora */
export type TimelineItem =
  | { kind: "message"; id: string; created_at: string; author_name: string; mine: boolean; message: ThreadMessage }
  | { kind: "photo"; id: string; created_at: string; author_name: string; mine: boolean; photo: EventPhoto };

interface ChatThreadProps {
  items: TimelineItem[];
  onOpenPhoto: (photoId: string) => void;
}

const NEAR_BOTTOM_PX = 160;

const pageBottomGap = () =>
  document.documentElement.scrollHeight - window.scrollY - window.innerHeight;

export function ChatThread({ items, onOpenPhoto }: ChatThreadProps) {
  const wasNearBottom = useRef(true);
  const firstScroll = useRef(true);
  const last = items[items.length - 1];

  // Recordar si el invitado estaba al final antes de que llegue algo nuevo
  useEffect(() => {
    const onScroll = () => {
      wasNearBottom.current = pageBottomGap() < NEAR_BOTTOM_PX;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bajar al final al abrir, si ya estaba abajo o si lo nuevo es propio
  useLayoutEffect(() => {
    if (!last) return;
    if (firstScroll.current || wasNearBottom.current || last.mine) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: firstScroll.current ? "auto" : "smooth",
      });
      firstScroll.current = false;
    }
  }, [last?.id, last?.mine]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-serif text-lg text-ink">Aún no hay mensajes</p>
        <p className="text-xs text-slate-500 mt-1">Deja unas palabras para los novios o saluda a los demás invitados.</p>
      </div>
    );
  }

  return (
    <ol className="space-y-4" aria-live="polite">
      {items.map((item, i) => {
        const prev = items[i - 1];
        const next = items[i + 1];
        const day = formatDay(item.created_at);
        const newDay = !prev || formatDay(prev.created_at) !== day;
        const sameAsNext = !!next && !next.mine && next.author_name === item.author_name && formatDay(next.created_at) === day;
        const tone = authorTone(item.author_name);
        return (
          <Fragment key={`${item.kind}-${item.id}`}>
            {newDay && (
              <li className="flex justify-center">
                <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500 bg-white border border-slate-100 px-4 py-1.5 rounded-full shadow-card">
                  {day}
                </span>
              </li>
            )}
            {item.mine ? (
              <li className="flex justify-end">
                <Bubble item={item} mine onOpenPhoto={onOpenPhoto} />
              </li>
            ) : (
              <li className="flex items-end gap-2">
                {sameAsNext ? (
                  <span className="w-8 shrink-0" aria-hidden="true" />
                ) : (
                  <span
                    className={`w-8 h-8 shrink-0 rounded-full border-2 border-white shadow-card flex items-center justify-center text-[11px] font-bold ${tone.avatar}`}
                    aria-hidden="true"
                  >
                    {initials(item.author_name)}
                  </span>
                )}
                <Bubble item={item} mine={false} nameClass={tone.name} onOpenPhoto={onOpenPhoto} />
              </li>
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

function Bubble({
  item,
  mine,
  nameClass,
  onOpenPhoto,
}: {
  item: TimelineItem;
  mine: boolean;
  nameClass?: string;
  onOpenPhoto: (photoId: string) => void;
}) {
  const shell = mine
    ? "bg-ink text-white rounded-2xl rounded-br-md shadow-lift"
    : "bg-white border border-slate-100 rounded-2xl rounded-bl-md shadow-card";
  const timeClass = mine ? "text-white/60" : "text-slate-400";

  if (item.kind === "photo") {
    return (
      <div className={`max-w-[78%] w-60 p-1.5 ${shell}`}>
        {!mine && <p className={`text-[11px] font-bold px-2.5 pt-1 ${nameClass}`}>{item.author_name}</p>}
        <button
          type="button"
          onClick={() => onOpenPhoto(item.photo.id)}
          className="block w-full mt-1 overflow-hidden rounded-xl"
          aria-label={`Ver foto de ${item.author_name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photo.thumb_url} alt="" loading="lazy" decoding="async" className="w-full h-40 object-cover" />
        </button>
        <p className={`text-[10px] text-right px-2.5 py-1 ${timeClass}`}>{formatClock(item.created_at)}</p>
      </div>
    );
  }

  const { message } = item;
  return (
    <div className={`max-w-[78%] px-4 py-2.5 ${shell} ${message.pending ? "opacity-60" : ""}`}>
      {!mine && <p className={`text-[11px] font-bold ${nameClass}`}>{item.author_name}</p>}
      <p className={`text-[15px] whitespace-pre-wrap break-words ${mine ? "font-medium" : "text-ink mt-0.5"}`}>
        {message.body}
      </p>
      <p className={`text-[10px] text-right mt-1 ${timeClass}`}>
        {message.pending ? "Enviando…" : formatClock(item.created_at)}
      </p>
    </div>
  );
}
