import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { EventPhoto } from "@/lib/types";

/** Solo para route handlers: los invitados no tienen sesión, todo pasa por aquí */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const PHOTO_BUCKET = "event-photos";
export const MESSAGE_MAX = 500;

export interface MomentsGroup {
  groupId: string;
  weddingId: string;
  coupleName: string;
  enabled: boolean;
}

type GroupRow = {
  id: string;
  wedding_id: string;
  weddings: { couple_name: string; moments_enabled?: boolean | null } | null;
};

/** Busca el grupo por su pass_uuid. Sin la migración 009, Momentos queda desactivado. */
export async function resolveGroup(uuid: string): Promise<MomentsGroup | null> {
  const query = (fields: string) =>
    supabaseAdmin
      .from("guest_groups")
      .select(`id, wedding_id, weddings (${fields})`)
      .eq("pass_uuid", uuid)
      .single() as unknown as Promise<{ data: GroupRow | null; error: { message: string } | null }>;

  let { data, error } = await query("couple_name, moments_enabled");
  if (error && /moments_enabled/.test(error.message || "")) {
    ({ data, error } = await query("couple_name"));
  }
  if (error || !data) return null;
  return {
    groupId: data.id,
    weddingId: data.wedding_id,
    coupleName: data.weddings?.couple_name || "",
    enabled: !!data.weddings?.moments_enabled,
  };
}

/** Grupo válido y con Momentos activado; si no, la respuesta de error a devolver */
export async function requireEnabledGroup(
  uuid: string
): Promise<{ group: MomentsGroup; error?: never } | { group?: never; error: NextResponse }> {
  const group = await resolveGroup(uuid);
  if (!group) return { error: NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 }) };
  if (!group.enabled) {
    return { error: NextResponse.json({ error: "Momentos no está disponible" }, { status: 403 }) };
  }
  return { group };
}

/** Solo los invitados confirmados (o que ya entraron al evento) usan Momentos */
export const CONFIRMED_STATUSES = ["confirmed", "checked_in"];

export const memberName = (g: { first_name: string; last_name: string | null }) =>
  [g.first_name, g.last_name].filter(Boolean).join(" ");

/** El autor lo decide el servidor: el invitado debe ser del grupo del pase y estar confirmado */
export async function resolveMember(groupId: string, guestId: unknown) {
  if (typeof guestId !== "string" || !guestId) return null;
  const { data } = await supabaseAdmin
    .from("guests")
    .select("id, first_name, last_name")
    .eq("id", guestId)
    .eq("group_id", groupId)
    .in("status", CONFIRMED_STATUSES)
    .maybeSingle();
  return data ? { id: data.id as string, name: memberName(data) } : null;
}

/** Cuántas filas creó el grupo en la ventana dada (límite anti-spam simple) */
export async function countRecent(table: "chat_messages" | "event_photos", groupId: string, windowMs: number) {
  const { count } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)
    .gte("created_at", new Date(Date.now() - windowMs).toISOString());
  return count || 0;
}

export const photoPaths = (weddingId: string, photoId: string, ext: "webp" | "jpg") => ({
  path: `${weddingId}/${photoId}.${ext}`,
  thumbPath: `${weddingId}/${photoId}_t.${ext}`,
});

export const publicUrl = (path: string) =>
  supabaseAdmin.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

type PhotoRow = {
  id: string;
  guest_id: string | null;
  author_name: string;
  path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
};

export const PHOTO_FIELDS = "id, guest_id, author_name, path, thumb_path, width, height, created_at";
export const MESSAGE_FIELDS = "id, guest_id, author_name, body, created_at";

export function toEventPhoto(row: PhotoRow): EventPhoto {
  return {
    id: row.id,
    guest_id: row.guest_id,
    author_name: row.author_name,
    url: publicUrl(row.path),
    thumb_url: publicUrl(row.thumb_path),
    width: row.width,
    height: row.height,
    created_at: row.created_at,
  };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
