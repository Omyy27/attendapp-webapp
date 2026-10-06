"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface HeroVideoProps {
  src: string;
  poster: string;
  coupleName: string;
  eventDate: string;
  /** true cuando la carta ya está abierta: el video empieza a reproducirse */
  active: boolean;
  /** id del elemento al que baja el dock de scroll */
  scrollTargetId: string;
}

export function HeroVideo({
  src,
  poster,
  coupleName,
  eventDate,
  active,
  scrollTargetId,
}: HeroVideoProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // iOS exige la propiedad (no solo el atributo) para permitir autoplay
    video.muted = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || reduced) {
      video.pause();
      return;
    }
    // Si el navegador bloquea el autoplay (ahorro de batería), queda el poster
    video.play().catch(() => {});
  }, [active]);

  // El dock desaparece en cuanto el invitado empieza a bajar
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6, 1] }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  function scrollToLetter() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(scrollTargetId)
      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  return (
    <section ref={sectionRef} className="hero-full relative w-full overflow-hidden bg-ink">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="hero-video-fade absolute inset-0" aria-hidden="true" />

      <div
        className="letter-reveal absolute inset-x-0 bottom-[22%] px-8 text-center text-white"
        style={{ "--d": "0.1s" } as CSSProperties}
      >
        <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-gold font-semibold">
          Nos casamos
        </p>
        <h1 className="font-serif text-4xl md:text-6xl mt-3 leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
          {coupleName}
        </h1>
        <p className="text-xs md:text-sm mt-2 tracking-wider text-white/85">{eventDate}</p>
      </div>

      {/* Chevron flotante: invita a desplazarse hacia abajo */}
      <button
        type="button"
        onClick={scrollToLetter}
        aria-label="Desplazarse a la invitación"
        tabIndex={heroVisible ? 0 : -1}
        className={`scroll-dock absolute left-1/2 -translate-x-1/2 rounded-full p-3 text-white/85 transition-opacity duration-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
          heroVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <svg
          className="h-7 w-7 drop-shadow-[0_1px_4px_rgba(0,0,0,0.35)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </section>
  );
}
