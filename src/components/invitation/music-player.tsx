"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

export interface MusicPlayerHandle {
  /**
   * Hay que llamarlo dentro de un gesto del usuario (el toque en el sello):
   * iOS y Android solo permiten audio si el primer `play()` nace de un toque.
   * Queda sonando en mudo; el sonido entra cuando la carta está abierta.
   */
  unlock: () => void;
}

export interface MusicPlayerProps {
  src: string;
  title: string;
  /** volumen final (0–1) */
  volume?: number;
  /** true cuando la carta ya está abierta y nada la tapa: aparece el botón y entra la música */
  active: boolean;
  ref?: Ref<MusicPlayerHandle>;
}

const FADE_MS = 2500;
const TITLE_MS = 4000;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Música de fondo con un botón flotante para pausar o reanudar. Arranca sola al
 * abrir la carta; si el navegador la bloquea (carta abierta sin tocar el sello),
 * queda en pausa con un pulso y el primer toque en la página la inicia.
 */
export function MusicPlayer({ src, title, volume = 0.5, active, ref }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fadeRef = useRef(0);
  // El invitado la pausó a propósito: no volver a arrancarla sola
  const userPausedRef = useRef(false);
  // La pausó la app (segundo plano): reanudar al volver
  const resumeRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [userPaused, setUserPaused] = useState(false);

  if (active && !shown) setShown(true);

  function fadeTo(target: number) {
    const audio = audioRef.current;
    if (!audio) return;
    cancelAnimationFrame(fadeRef.current);
    // iOS ignora `volume` (lo manda el volumen del teléfono): el fade no estorba
    if (prefersReducedMotion()) {
      audio.volume = target;
      return;
    }
    const from = audio.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      // `now` (reloj del frame) puede ir unos ms por detrás de t0: sin el máximo, k < 0
      const k = Math.min(1, Math.max(0, (now - t0) / FADE_MS));
      audio.volume = Math.min(1, Math.max(0, from + (target - from) * k));
      if (k < 1) fadeRef.current = requestAnimationFrame(step);
    };
    fadeRef.current = requestAnimationFrame(step);
  }

  /** Quita el mudo, sube el volumen y reproduce si hace falta. */
  function start() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.muted || audio.paused) audio.volume = 0;
    audio.muted = false;
    fadeTo(volume);
    if (audio.paused) audio.play().catch(() => {});
  }

  useImperativeHandle(ref, () => ({
    unlock() {
      const audio = audioRef.current;
      if (!audio || !audio.paused) return;
      audio.muted = true;
      audio.play().catch(() => {});
    },
  }));

  // Entra la música al quedar la carta abierta
  useEffect(() => {
    if (active && !userPausedRef.current) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Carta abierta sin gesto previo: el primer toque en la página inicia la música
  useEffect(() => {
    if (!active) return;
    const onTouch = (e: PointerEvent) => {
      const audio = audioRef.current;
      if (!audio || !audio.paused || userPausedRef.current) return;
      if (buttonRef.current?.contains(e.target as Node)) return;
      start();
    };
    document.addEventListener("pointerup", onTouch, true);
    return () => document.removeEventListener("pointerup", onTouch, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Segundo plano: pausa; al volver, reanuda solo si el invitado no la había pausado
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.visibilityState === "hidden") {
        if (!audio.paused) {
          resumeRef.current = true;
          audio.pause();
        }
      } else if (resumeRef.current) {
        resumeRef.current = false;
        if (!userPausedRef.current) audio.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // El título se muestra un momento y el botón queda como círculo
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setExpanded(false), TITLE_MS);
    return () => clearTimeout(timer);
  }, [shown]);

  useEffect(() => () => cancelAnimationFrame(fadeRef.current), []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      userPausedRef.current = false;
      setUserPaused(false);
      start();
    } else {
      userPausedRef.current = true;
      setUserPaused(true);
      audio.pause();
    }
  }

  const waiting = shown && !playing && !userPaused;

  return (
    <>
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="none"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar música" : "Reproducir música"}
        aria-pressed={playing}
        tabIndex={shown ? 0 : -1}
        className={`music-fab fixed z-40 flex h-11 items-center rounded-full border border-inv-rose/50 bg-inv-bone/90 px-3.5 text-inv-olive-deep shadow-lift backdrop-blur transition-opacity duration-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inv-rose ${
          shown ? "opacity-100" : "pointer-events-none opacity-0"
        } ${waiting ? "music-pulse" : ""}`}
      >
        {playing ? (
          <span className="music-eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )}
        <span
          className={`overflow-hidden whitespace-nowrap text-xs font-medium tracking-wide transition-all duration-500 ${
            expanded ? "ml-2 max-w-40 opacity-100" : "ml-0 max-w-0 opacity-0"
          }`}
          aria-hidden="true"
        >
          {title}
        </span>
      </button>
    </>
  );
}
