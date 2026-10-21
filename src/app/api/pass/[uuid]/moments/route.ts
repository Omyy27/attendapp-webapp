import { NextRequest, NextResponse } from "next/server";
import {
  CONFIRMED_STATUSES,
  MESSAGE_FIELDS,
  PHOTO_FIELDS,
  memberName,
  resolveGroup,
  resolveMember,
  supabaseAdmin,
  toEventPhoto,
} from "@/lib/moments-server";
import type { ChatMessage } from "@/lib/types";

const PHOTO_LIMIT = 300;
const MESSAGE_LIMIT = 150;
// Margen al pedir "lo nuevo": una fila puede confirmarse con un created_at algo
// anterior al último visto. El cliente descarta duplicados por id.
const SINCE_OVERLAP_MS = 15000;

// GET: integrantes del grupo, fotos y mensajes del evento.
// Con ?since=<iso> solo devuelve lo creado desde entonces (polling).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const group = await resolveGroup(uuid);
    if (!group) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }
    const headers = { "Cache-Control": "no-store" };
    if (!group.enabled) {
      return NextResponse.json({ enabled: false, couple_name: group.coupleName }, { headers });
    }

    // Sin invitados confirmados en el grupo no se entrega nada del evento
    const { data: confirmedMembers, error: membersError } = await supabaseAdmin
      .from("guests")
      .select("id, first_name, last_name")
      .eq("group_id", group.groupId)
      .in("status", CONFIRMED_STATUSES)
      .order("first_name");
    if (membersError) throw membersError;
    if (!confirmedMembers?.length) {
      return NextResponse.json(
        { enabled: true, confirmed: false, couple_name: group.coupleName },
        { headers }
      );
    }

    const sinceParam = request.nextUrl.searchParams.get("since");
    const sinceMs = sinceParam ? Date.parse(sinceParam) : NaN;
    const since = Number.isFinite(sinceMs) ? new Date(sinceMs - SINCE_OVERLAP_MS).toISOString() : null;

    let photosQuery = supabaseAdmin
      .from("event_photos")
      .select(PHOTO_FIELDS)
      .eq("wedding_id", group.weddingId)
      .order("created_at", { ascending: false })
      .limit(PHOTO_LIMIT);
    let messagesQuery = supabaseAdmin
      .from("chat_messages")
      .select(MESSAGE_FIELDS)
      .eq("wedding_id", group.weddingId)
      .order("created_at", { ascending: false })
      .limit(MESSAGE_LIMIT);
    if (since) {
      photosQuery = photosQuery.gt("created_at", since);
      messagesQuery = messagesQuery.gt("created_at", since);
    }

    const guestParam = request.nextUrl.searchParams.get("guest");
    const [photos, messages, likes, me] = await Promise.all([
      photosQuery,
      messagesQuery,
      // Los "me gusta" se mandan completos en cada consulta: cambian sobre fotos viejas
      supabaseAdmin.from("photo_likes").select("photo_id, guest_id").eq("wedding_id", group.weddingId),
      guestParam ? resolveMember(group.groupId, guestParam) : Promise.resolve(null),
    ]);
    if (photos.error || messages.error) {
      console.error("Moments fetch error:", photos.error || messages.error);
      return NextResponse.json({ error: "No se pudo cargar" }, { status: 500 });
    }

    // Sin la migración 010 no hay tabla de likes: se responde sin ellos
    if (likes.error && !/photo_likes/.test(likes.error.message || "")) {
      console.error("Moments likes error:", likes.error);
    }
    const likeCounts: Record<string, number> = {};
    const myLikes: string[] = [];
    for (const row of likes.data || []) {
      likeCounts[row.photo_id] = (likeCounts[row.photo_id] || 0) + 1;
      if (me && row.guest_id === me.id) myLikes.push(row.photo_id);
    }

    return NextResponse.json(
      {
        enabled: true,
        couple_name: group.coupleName,
        confirmed: true,
        full: !since,
        members: confirmedMembers.map((g) => ({ id: g.id as string, name: memberName(g) })),
        photos: (photos.data || []).map(toEventPhoto),
        // Los mensajes van del más antiguo al más nuevo
        messages: ((messages.data || []) as ChatMessage[]).reverse(),
        likes: likeCounts,
        my_likes: myLikes,
      },
      { headers }
    );
  } catch (error) {
    console.error("Moments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
