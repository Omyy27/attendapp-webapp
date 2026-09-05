import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

let configured = false;
function ensureConfig() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    "mailto:attendapp@ejemplo.com",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Envía una notificación push a todos los organizadores de un evento.
 * Elimina automáticamente las suscripciones que ya expiraron (410).
 */
export async function sendPushToWeddingOrganizers(
  weddingId: string,
  payload: PushPayload
): Promise<void> {
  if (!ensureConfig()) {
    console.warn("VAPID keys no configuradas — push omitido");
    return;
  }

  try {
    // 1. Organizadores del evento
    const { data: organizers } = await supabaseAdmin
      .from("organizers")
      .select("user_id")
      .eq("wedding_id", weddingId);

    if (!organizers || organizers.length === 0) return;
    const userIds = organizers.map((o) => o.user_id);

    // 2. Suscripciones activas
    const { data: subscriptions } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);

    if (!subscriptions || subscriptions.length === 0) return;

    // 3. Enviar en paralelo, limpiando las que expiraron
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload)
          );
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      })
    );
  } catch (error) {
    console.error("Push send error:", error);
  }
}
