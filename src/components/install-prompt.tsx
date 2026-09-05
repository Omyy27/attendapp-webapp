"use client";

import { useState, useEffect, useCallback } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Ya instalada (standalone o display-mode standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("getInstalledRelatedApps" in navigator && false);

    if (isStandalone || localStorage.getItem("attendapp_installed") === "1") {
      setInstalled(true);
    }

    setDismissed(localStorage.getItem("attendapp_install_dismissed") === "1");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      localStorage.setItem("attendapp_installed", "1");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      localStorage.setItem("attendapp_installed", "1");
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem("attendapp_install_dismissed", "1");
    setDismissed(true);
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  return (
    <div className="bg-card rounded-2xl border border-line shadow-card p-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold mb-3">
        Aplicación
      </p>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-content">Instalar Attendapp</p>
          <p className="text-[11px] text-muted mt-0.5">Acceso directo desde tu pantalla de inicio</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-2.5 text-xs font-semibold shadow-card hover:bg-ink-light dark:hover:bg-gold-deep transition-colors"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 bg-field text-muted rounded-xl py-2.5 text-xs font-semibold hover:bg-line-strong/60 transition-colors"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
