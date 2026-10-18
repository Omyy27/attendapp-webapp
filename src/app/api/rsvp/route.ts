import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { uuid } = await request.json();

    if (!uuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    // 1. Buscar el grupo por pass_uuid
    const { data: group, error: groupError } = await supabaseAdmin
      .from("guest_groups")
      .select("id, name, wedding_id")
      .eq("pass_uuid", uuid)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Pase no encontrado" }, { status: 404 });
    }

    // Modo "organizer": la confirmación la marca el organizador en el panel, no el invitado.
    // Si la columna aún no existe (migración 005 pendiente), se asume el modo original.
    const { data: wedding } = await supabaseAdmin
      .from("weddings")
      .select("confirmation_mode")
      .eq("id", group.wedding_id)
      .single();
    if (wedding?.confirmation_mode === "organizer") {
      return NextResponse.json(
        { result: "disabled", message: "La confirmación se hace con quien te envió la invitación" },
        { status: 403 }
      );
    }

    // 2. Contar pendientes antes de confirmar
    const { count: pendingCount } = await supabaseAdmin
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id)
      .in("status", ["pending", "opened"]);

    if (!pendingCount || pendingCount === 0) {
      return NextResponse.json({ result: "already_confirmed", message: "Asistencia ya confirmada" });
    }

    // 3. Confirmar asistencia (pending → confirmed)
    await supabaseAdmin
      .from("guests")
      .update({ status: "confirmed" })
      .eq("group_id", group.id)
      .in("status", ["pending", "opened"]);

    // 4. Conteos finales
    const { count: totalCount } = await supabaseAdmin
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id);

    // Notificar push al organizador (no bloquea la respuesta)
    if (group.wedding_id) {
      const { sendPushToWeddingOrganizers } = await import("@/lib/push");
      sendPushToWeddingOrganizers(group.wedding_id, {
        title: "Confirmación de asistencia",
        body: `${group.name} confirmó asistencia (${pendingCount} persona${pendingCount === 1 ? "" : "s"})`,
        url: "/",
        tag: "rsvp",
      });
    }

    return NextResponse.json({
      result: "confirmed",
      group_name: group.name,
      confirmed_count: (totalCount || 0) - pendingCount,
      total_count: totalCount || 0,
      message: "Asistencia confirmada",
    });
  } catch (error) {
    console.error("RSVP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
