import { NextRequest, NextResponse } from "next/server";
import {
  PHOTO_BUCKET,
  countRecent,
  photoPaths,
  requireEnabledGroup,
  resolveMember,
  supabaseAdmin,
} from "@/lib/moments-server";

const RATE_WINDOW_MS = 60 * 60_000;
const RATE_MAX = 40;

// POST: URLs firmadas para que el navegador suba la foto y su miniatura
// directo a Storage (sin pasar el archivo por el proxy ni por esta ruta)
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

    if ((await countRecent("event_photos", group.groupId, RATE_WINDOW_MS)) >= RATE_MAX) {
      return NextResponse.json({ error: "Alcanzaste el límite de fotos por ahora" }, { status: 429 });
    }

    const ext = payload?.ext === "jpg" ? "jpg" : "webp";
    const photoId = crypto.randomUUID();
    const { path, thumbPath } = photoPaths(group.weddingId, photoId, ext);
    const bucket = supabaseAdmin.storage.from(PHOTO_BUCKET);
    const [full, thumb] = await Promise.all([
      bucket.createSignedUploadUrl(path),
      bucket.createSignedUploadUrl(thumbPath),
    ]);
    if (full.error || thumb.error) throw full.error || thumb.error;

    return NextResponse.json({
      photoId,
      ext,
      full: { path, token: full.data.token },
      thumb: { path: thumbPath, token: thumb.data.token },
    });
  } catch (error) {
    console.error("Moments upload-url error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
