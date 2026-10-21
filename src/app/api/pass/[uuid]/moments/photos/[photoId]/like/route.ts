import { NextRequest, NextResponse } from "next/server";
import { UUID_RE, requireEnabledGroup, resolveMember, supabaseAdmin } from "@/lib/moments-server";

// POST: el invitado da o quita su "me gusta" a una foto del evento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string; photoId: string }> }
) {
  try {
    const { uuid, photoId } = await params;
    if (!UUID_RE.test(photoId)) {
      return NextResponse.json({ error: "Foto no válida" }, { status: 400 });
    }
    const { group, error } = await requireEnabledGroup(uuid);
    if (error) return error;

    const payload = await request.json().catch(() => null);
    const member = await resolveMember(group.groupId, payload?.guestId);
    if (!member) return NextResponse.json({ error: "Invitado no válido" }, { status: 403 });
    const liked = payload?.liked === true;

    const { data: photo } = await supabaseAdmin
      .from("event_photos")
      .select("id")
      .eq("id", photoId)
      .eq("wedding_id", group.weddingId)
      .maybeSingle();
    if (!photo) return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });

    const likes = supabaseAdmin.from("photo_likes");
    const { error: writeError } = liked
      ? await likes.upsert(
          { photo_id: photoId, guest_id: member.id, wedding_id: group.weddingId },
          { onConflict: "photo_id,guest_id", ignoreDuplicates: true }
        )
      : await likes.delete().eq("photo_id", photoId).eq("guest_id", member.id);
    if (writeError) throw writeError;

    const { count } = await supabaseAdmin
      .from("photo_likes")
      .select("photo_id", { count: "exact", head: true })
      .eq("photo_id", photoId);

    return NextResponse.json({ liked, count: count || 0 });
  } catch (error) {
    console.error("Moments like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
