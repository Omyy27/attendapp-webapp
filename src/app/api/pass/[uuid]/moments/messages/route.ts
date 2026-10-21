import { NextRequest, NextResponse } from "next/server";
import {
  MESSAGE_FIELDS,
  MESSAGE_MAX,
  countRecent,
  requireEnabledGroup,
  resolveMember,
  supabaseAdmin,
} from "@/lib/moments-server";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 12;

// POST: un invitado del grupo publica un mensaje en el chat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const { group, error } = await requireEnabledGroup(uuid);
    if (error) return error;

    const payload = await request.json().catch(() => null);
    const body = typeof payload?.body === "string" ? payload.body.trim() : "";
    if (!body || body.length > MESSAGE_MAX) {
      return NextResponse.json({ error: `El mensaje debe tener entre 1 y ${MESSAGE_MAX} caracteres` }, { status: 400 });
    }

    const member = await resolveMember(group.groupId, payload?.guestId);
    if (!member) return NextResponse.json({ error: "Invitado no válido" }, { status: 403 });

    if ((await countRecent("chat_messages", group.groupId, RATE_WINDOW_MS)) >= RATE_MAX) {
      return NextResponse.json({ error: "Vas muy rápido, espera un momento" }, { status: 429 });
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("chat_messages")
      .insert({
        wedding_id: group.weddingId,
        group_id: group.groupId,
        guest_id: member.id,
        author_name: member.name,
        body,
      })
      .select(MESSAGE_FIELDS)
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error("Moments message error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
