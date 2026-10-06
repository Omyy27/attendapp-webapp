"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "@/lib/invitation-sample";

const AUTOPLAY_MS = 5000;
const RESUME_AFTER_TOUCH_MS = 8000;

export function PhotoCarousel({ photos }: { photos: GalleryPhoto[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [touched, setTouched] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  // Slide activo = el que ocupa la mayor parte de la pista
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { root: track, threshold: 0.6 }
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [photos.length]);

  // Solo avanzar solo cuando el carrusel está en pantalla
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(track);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(resumeTimer.current), []);

  const goTo = useCallback((index: number) => {
    const track = trackRef.current;
    const slide = slideRefs.current[index];
    if (!track || !slide) return;
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (hovered || touched || !onScreen || photos.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => goTo((active + 1) % photos.length), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [active, hovered, touched, onScreen, photos.length, goTo]);

  function pauseAfterTouch() {
    setTouched(true);
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setTouched(false), RESUME_AFTER_TOUCH_MS);
  }

  if (photos.length === 0) return null;

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Galería de fotos de los novios"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        ref={trackRef}
        className="carousel-track relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-[11%] py-6"
        onPointerDown={pauseAfterTouch}
        onWheel={pauseAfterTouch}
      >
        {photos.map((photo, i) => (
          <figure
            key={photo.src}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            data-index={i}
            className="polaroid w-[78%] shrink-0 snap-center"
            style={{ rotate: `${i % 2 === 0 ? -1.5 : 1.5}deg` }}
            aria-label={`Foto ${i + 1} de ${photos.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              draggable={false}
              className="aspect-[4/5] w-full object-cover"
            />
          </figure>
        ))}
      </div>

      {/* Anterior / siguiente (escritorio) */}
      <button
        type="button"
        onClick={() => goTo(Math.max(active - 1, 0))}
        disabled={active === 0}
        aria-label="Foto anterior"
        className="absolute left-1 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-lift transition-opacity hover:bg-white disabled:opacity-0 md:flex"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => goTo(Math.min(active + 1, photos.length - 1))}
        disabled={active === photos.length - 1}
        aria-label="Foto siguiente"
        className="absolute right-1 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink shadow-lift transition-opacity hover:bg-white disabled:opacity-0 md:flex"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Puntos */}
      <div className="flex justify-center gap-2">
        {photos.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => {
              pauseAfterTouch();
              goTo(i);
            }}
            aria-label={`Ver foto ${i + 1}`}
            aria-current={i === active}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-5 bg-gold-deep" : "w-1.5 bg-gold/40 hover:bg-gold/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
