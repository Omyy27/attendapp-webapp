"use client";

import type { CSSProperties } from "react";

// Tiempos de la previa (s). Deben coincidir con la coreografía de globals.css:
// la carta termina de cubrir la pantalla ~2.1 s después de tocar el sello.
const PREVIEW_START = 1.9;
const LINE_DURATION = 0.85;
const FINAL_HOLD = 0.7;
const FADE = 0.6;

function finalDelay(lineCount: number) {
  return PREVIEW_START + lineCount * LINE_DURATION;
}

/** Duración total de la apertura, para esperar antes de mostrar la carta abierta */
export function openingDurationMs(lineCount: number) {
  return Math.round((finalDelay(lineCount) + FINAL_HOLD + FADE) * 1000);
}

export interface EnvelopeIntroProps {
  coupleName: string;
  eventDate: string;
  /** Frases que aparecen una tras otra antes de «¡Nos casamos!» */
  previewLines: string[];
  opening: boolean;
  error?: string | null;
  onOpen: () => void;
}

/**
 * Sobre a pantalla completa. Toda la pantalla es el sobre: solapa superior con
 * sello de lacre y bolsillo inferior con los nombres. Al tocar, se rompe el
 * sello, se abre la solapa y la carta sale hasta cubrir la pantalla
 * (coreografía en globals.css bajo `.intro-opening`).
 */
export function EnvelopeIntro({
  coupleName,
  eventDate,
  previewLines,
  opening,
  error,
  onOpen,
}: EnvelopeIntroProps) {
  const fadeDelay = finalDelay(previewLines.length) + FINAL_HOLD;

  return (
    <div
      className={`env-stage fixed inset-0 z-50 overflow-hidden ${
        opening ? "intro-opening" : ""
      }`}
      style={{ "--intro-fade-delay": `${fadeDelay}s` } as CSSProperties}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        aria-busy={opening}
        aria-label="Abrir carta de invitación y confirmar asistencia"
        className="env-button absolute inset-0 block h-full w-full cursor-pointer focus-visible:outline-none"
      >
        <span className="env-back" aria-hidden="true" />

        {/* Carta dentro del sobre */}
        <span className="env-letter paper-texture" aria-hidden="true">
          <span className="env-letter-inner">
            <span className="block text-[10px] uppercase tracking-[0.35em] text-gold-deep font-semibold">
              Se complacen en invitarte
            </span>
            <span className="block font-serif text-3xl md:text-4xl text-ink mt-3 leading-tight">
              {coupleName}
            </span>
            <span className="ornament-divider mt-4" />
          </span>
        </span>

        {/* Bolsillo (solapas laterales e inferior) */}
        <span className="env-front" aria-hidden="true">
          <span className="env-front-paper paper-texture" />
          <span className="env-folds">
            <span className="env-fold env-fold-left" />
            <span className="env-fold env-fold-right" />
          </span>
        </span>

        {/* Nombres en el frente del sobre */}
        <span className="env-address">
          <span className="block text-[10px] md:text-[11px] uppercase tracking-[0.35em] text-gold-deep font-semibold">
            Se complacen en invitarte
          </span>
          <span className="block font-serif text-3xl md:text-5xl text-ink mt-3 leading-tight">
            {coupleName}
          </span>
          <span className="block text-xs md:text-sm text-slate-500 mt-2 tracking-wider">
            {eventDate}
          </span>
          <span className="env-hint mt-6 block text-[11px] md:text-xs font-semibold uppercase tracking-[0.25em]">
            {opening ? "Abriendo tu carta…" : "Toca el sello para abrir"}
          </span>
        </span>

        {/* Solapa superior */}
        <span className="env-flap" aria-hidden="true">
          <span className="env-flap-paper" />
        </span>

        {/* Marco dorado */}
        <span className="env-frame" aria-hidden="true" />

        {/* Sello de lacre (dos mitades para romperse) */}
        <span className="env-seal" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sello-lacre.webp" alt="" className="env-seal-half env-seal-l" draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sello-lacre.webp" alt="" className="env-seal-half env-seal-r" draggable={false} />
          <span className="env-sparkles">
            <i /><i /><i /><i /><i /><i />
          </span>
        </span>
      </button>

      {/* Previa: frases sobre la carta desplegada, antes de mostrar el video */}
      <div className="env-preview pointer-events-none absolute inset-0 z-[55]" aria-hidden="true">
        {previewLines.map((line, i) => (
          <p
            key={line}
            className="env-preview-line font-serif italic text-2xl md:text-3xl text-ink"
            style={{ "--d": `${PREVIEW_START + i * LINE_DURATION}s` } as CSSProperties}
          >
            {line}
          </p>
        ))}
        <div
          className="env-preview-final text-center"
          style={{ "--d": `${finalDelay(previewLines.length)}s` } as CSSProperties}
        >
          <p className="text-[11px] md:text-xs uppercase tracking-[0.4em] text-gold-deep font-semibold">
            ¡Nos casamos!
          </p>
          <p className="font-serif text-4xl md:text-6xl text-ink mt-3 leading-tight">{coupleName}</p>
          <span className="ornament-divider mt-5" />
        </div>
      </div>

      <span className="sr-only" aria-live="polite">
        {opening ? `${previewLines.join(" ")} ¡Nos casamos! ${coupleName}` : ""}
      </span>

      {error && (
        <p
          role="alert"
          className="pointer-events-none absolute inset-x-6 bottom-[6%] z-[60] mx-auto max-w-sm rounded-full bg-rose-50/95 px-4 py-2 text-center text-xs font-medium text-rose-600 shadow-lift"
        >
          {error}
        </p>
      )}
    </div>
  );
}
