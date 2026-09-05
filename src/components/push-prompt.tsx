"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribing, setSubscribing] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    // Verificar si ya hay una suscripción activa
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setEnabled(!!sub);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission !== "granted") return;

      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID no configurado");

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        }));

      const json = subscription.toJSON();
      const keys = json.keys as { p256dh: string; auth: string };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      setEnabled(true);
    } catch (error) {
      console.error("Push subscribe error:", error);
    } finally {
      setSubscribing(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setEnabled(false);
    } catch (error) {
      console.error("Push unsubscribe error:", error);
    } finally {
      setSubscribing(false);
    }
  }, []);

  if (permission === "unsupported") return null;

  return (
    <div className="bg-card rounded-2xl border border-line shadow-card p-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted font-semibold mb-3">
        Notificaciones
      </p>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-content">
            {enabled ? "Notificaciones activas" : "Recibe alertas en vivo"}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {enabled
              ? "Te avisamos cuando un grupo llegue o confirme"
              : permission === "granted"
                ? "Toca activar para empezar a recibir alertas"
                : "Enterate cuando un grupo llegue o confirme asistencia"}
          </p>
        </div>
      </div>
      <button
        onClick={enabled ? unsubscribe : subscribe}
        disabled={subscribing || (permission !== "granted" && enabled)}
        className={`w-full mt-3 rounded-xl py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
          enabled
            ? "bg-field text-muted hover:bg-line-strong/60"
            : "bg-ink dark:bg-gold dark:text-ink text-white hover:bg-ink-light dark:hover:bg-gold-deep"
        }`}
      >
        {subscribing
          ? "Procesando..."
          : enabled
            ? "Desactivar notificaciones"
            : permission === "denied"
              ? "Permiso bloqueado en el navegador"
              : "Activar notificaciones"}
      </button>
    </div>
  );
}
