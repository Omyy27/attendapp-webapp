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
      .select("id, name")
      .eq("pass_uuid", uuid)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Pase no encontrado" }, { status: 404 });
    }

    // 2. Contar pendientes antes de confirmar
    const { count: pendingCount } = await supabaseAdmin
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id)
      .eq("status", "pending");

    if (!pendingCount || pendingCount === 0) {
      return NextResponse.json({ result: "already_confirmed", message: "Asistencia ya confirmada" });
    }

    // 3. Confirmar asistencia (pending → confirmed)
    await supabaseAdmin
      .from("guests")
      .update({ status: "confirmed" })
      .eq("group_id", group.id)
      .eq("status", "pending");

    // 4. Conteos finales
    const { count: totalCount } = await supabaseAdmin
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id);

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
