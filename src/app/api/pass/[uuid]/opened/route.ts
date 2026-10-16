import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * El invitado abrió la carta: marca a todo el grupo como `opened` (solo desde
 * `pending`, nunca baja de confirmed/checked_in) y guarda la primera apertura.
 * Es idempotente y tolerante: si la migración 004 aún no se ejecutó, no falla.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params;

  try {
    const { data: group } = await supabaseAdmin
      .from("guest_groups")
      .select("id")
      .eq("pass_uuid", uuid)
      .single();

    if (!group) return new NextResponse(null, { status: 404 });

    // Dos consultas separadas: así no hay carrera con la confirmación
    const opened = await supabaseAdmin
      .from("guests")
      .update({ opened_at: new Date().toISOString() })
      .eq("group_id", group.id)
      .is("opened_at", null);
    if (opened.error) console.error("opened_at:", opened.error.message);

    const status = await supabaseAdmin
      .from("guests")
      .update({ status: "opened" })
      .eq("group_id", group.id)
      .eq("status", "pending");
    if (status.error) console.error("status opened:", status.error.message);
  } catch (error) {
    console.error("Opened error:", error);
  }

  return new NextResponse(null, { status: 204 });
}
