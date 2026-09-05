"use client";

import { useEffect } from "react";

export function ScriptsLoader() {
  useEffect(() => {
    // Dark mode: aplicar tema antes del render para evitar flash
    try {
      const t = localStorage.getItem("attendapp_theme") || "system";
      const d =
        t === "dark" ||
        (t === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (d) document.documentElement.classList.add("dark");
    } catch (e) {}

    // Service Worker registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
