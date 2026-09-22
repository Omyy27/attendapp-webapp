"use client";

import { useEffect, useRef, useId } from "react";
import "leaflet/dist/leaflet.css";

type VenueMapProps = {
  lat: number;
  lng: number;
  name?: string;
  height?: number;
  draggable?: boolean;
  onPositionChange?: (lat: number, lng: number) => void;
};

export default function VenueMap({
  lat,
  lng,
  name = "Venue",
  height = 200,
  draggable = false,
  onPositionChange,
}: VenueMapProps) {
  const mapId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);

  // Inicializar mapa una sola vez
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 16,
        scrollWheelZoom: false,
        dragging: draggable,
        zoomControl: draggable,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "venue-map-pin",
        html: `<div style="position:relative;width:36px;height:46px;">
          <div style="position:absolute;top:0;left:0;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0a2540;border:2px solid #c8a054;box-shadow:0 4px 10px rgba(10,37,64,.35);"></div>
          <div style="position:absolute;top:11px;left:11px;width:14px;height:14px;border-radius:50%;background:#c8a054;"></div>
        </div>`,
        iconSize: [36, 46],
        iconAnchor: [18, 46],
        popupAnchor: [0, -46],
      });

      const marker = L.marker([lat, lng], { icon, draggable }).addTo(map);
      if (name) marker.bindPopup(`<b>${name}</b>`);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        if (pos && onPositionChange) onPositionChange(pos.lat, pos.lng);
      });

      map.on("click", (e) => {
        if (draggable) {
          marker.setLatLng(e.latlng);
          onPositionChange?.(e.latlng.lat, e.latlng.lng);
        }
      });

      mapRef.current = map;
      markerRef.current = marker;
    }

    init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar posición sin destruir el mapa
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([lat, lng], 16);
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      id={mapId}
      style={{ height, width: "100%", zIndex: 0 }}
      className="rounded-2xl overflow-hidden"
    />
  );
}
