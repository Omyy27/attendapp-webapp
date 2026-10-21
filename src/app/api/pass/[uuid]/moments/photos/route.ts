import { NextRequest, NextResponse } from "next/server";
import {
  PHOTO_BUCKET,
  PHOTO_FIELDS,
  UUID_RE,
  photoPaths,
  requireEnabledGroup,
  resolveMember,
  supabaseAdmin,
  toEventPhoto,
} from "@/lib/moments-server";

const toDimension = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

// POST: registra la foto una vez que el navegador terminó de subirla
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { group, error } = await requireEnabledGroup(uuid);
    if (error) return error;

    const payload = await request.json().catch(() => null);
    const member = await resolveMember(group.groupId, payload?.guestId);
    if (!member) return NextResponse.json({ error: "Invitado no válido" }, { status: 403 });

    const photoId = payload?.photoId;
    if (typeof photoId !== "string" || !UUID_RE.test(photoId)) {
      return NextResponse.json({ error: "Foto no válida" }, { status: 400 });
    }
    // Las rutas se arman aquí con el wedding del pase: no se aceptan rutas del cliente
    const { path, thumbPath } = photoPaths(group.weddingId, photoId, payload?.ext === "jpg" ? "jpg" : "webp");
    const bucket = supabaseAdmin.storage.from(PHOTO_BUCKET);
    const [full, thumb] = await Promise.all([bucket.exists(path), bucket.exists(thumbPath)]);
    if (!full.data || !thumb.data) {
      return NextResponse.json({ error: "La foto no terminó de subirse" }, { status: 400 });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("event_photos")
      .insert({
        id: photoId,
        wedding_id: group.weddingId,
        group_id: group.groupId,
        guest_id: member.id,
        author_name: member.name,
        path,
        thumb_path: thumbPath,
        width: toDimension(payload?.width),
        height: toDimension(payload?.height),
      })
      .select(PHOTO_FIELDS)
      .single();
    if (insertError) {
      // Clave duplicada: la foto ya estaba registrada
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "La foto ya estaba publicada" }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ photo: toEventPhoto(data) });
  } catch (error) {
    console.error("Moments photo error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
