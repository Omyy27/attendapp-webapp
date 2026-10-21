import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { canManageEvent } from "@/lib/roles";
import { PHOTO_BUCKET, UUID_RE, supabaseAdmin } from "@/lib/moments-server";

const STORAGE_PAGE = 1000;

/** Rutas de todos los archivos del evento en el bucket (incluye subidas sin terminar) */
async function listEventFiles(weddingId: string) {
  const bucket = supabaseAdmin.storage.from(PHOTO_BUCKET);
  const paths: string[] = [];
  for (let offset = 0; ; offset += STORAGE_PAGE) {
    const { data, error } = await bucket.list(weddingId, { limit: STORAGE_PAGE, offset });
    if (error) throw error;
    paths.push(...(data || []).map((f) => `${weddingId}/${f.name}`));
    if (!data || data.length < STORAGE_PAGE) return paths;
  }
}

/** Reinicio completo: archivos, fotos, mensajes y (en cascada) los "me gusta" */
async function resetMoments(weddingId: string) {
  try {
    const paths = await listEventFiles(weddingId);
    for (let i = 0; i < paths.length; i += STORAGE_PAGE) {
      const { error } = await supabaseAdmin.storage
        .from(PHOTO_BUCKET)
        .remove(paths.slice(i, i + STORAGE_PAGE));
      if (error) throw error;
    }
  } catch (error) {
    console.error("Moments reset storage error:", error);
  }

  const [photos, messages] = await Promise.all([
    supabaseAdmin.from("event_photos").delete({ count: "exact" }).eq("wedding_id", weddingId),
    supabaseAdmin.from("chat_messages").delete({ count: "exact" }).eq("wedding_id", weddingId),
  ]);
  if (photos.error || messages.error) throw photos.error || messages.error;
  return NextResponse.json({ ok: true, photos: photos.count || 0, messages: messages.count || 0 });
}

// DELETE: el organizador borra una foto (fila + archivos), un mensaje del chat,
// o reinicia Momentos por completo ({ type: "all" })
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: rows } = await supabaseAdmin
      .from("organizers")
      .select("wedding_id, role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const actor = rows?.[0] as { wedding_id: string; role: string } | undefined;
    if (!actor || !canManageEvent(actor.role)) {
      return NextResponse.json({ error: "No tienes permiso" }, { status: 403 });
    }

    const payload = await request.json().catch(() => null);
    const type = payload?.type;
    const id = payload?.id;
    if (type === "all") return await resetMoments(actor.wedding_id);
    if ((type !== "photo" && type !== "message") || typeof id !== "string" || !UUID_RE.test(id)) {
      return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
    }

    if (type === "message") {
      const { error } = await supabaseAdmin
        .from("chat_messages")
        .delete()
        .eq("id", id)
        .eq("wedding_id", actor.wedding_id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const { data: photo, error } = await supabaseAdmin
      .from("event_photos")
      .delete()
      .eq("id", id)
      .eq("wedding_id", actor.wedding_id)
      .select("path, thumb_path")
      .maybeSingle();
    if (error) throw error;
    if (photo) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(PHOTO_BUCKET)
        .remove([photo.path, photo.thumb_path]);
      if (storageError) console.error("Moments storage remove error:", storageError);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Moments DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
