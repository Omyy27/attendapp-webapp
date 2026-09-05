import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { uuid, scanner_id } = await request.json();

    if (!uuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("guest_groups")
      .select("id, name, table_number, pass_sent, wedding_id")
      .eq("pass_uuid", uuid)
      .single();

    if (groupError || !group) {
      return NextResponse.json({
        result: "invalid",
        message: "QR no valido",
      });
    }

    if (group.pass_sent) {
      const { data: existingLog } = await supabaseAdmin
        .from("scan_logs")
        .select("id")
        .eq("group_id", group.id)
        .eq("result", "valid")
        .single();

      if (existingLog) {
        await supabaseAdmin.from("scan_logs").insert({
          group_id: group.id,
          scanner_id: scanner_id || null,
          result: "already_used",
        });

        return NextResponse.json({
          result: "already_used",
          message: "QR ya utilizado",
        });
      }
    }

    await supabaseAdmin
      .from("guests")
      .update({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
        checked_in_method: "qr",
      })
      .eq("group_id", group.id)
      .eq("status", "pending");

    await supabaseAdmin
      .from("guest_groups")
      .update({ pass_sent: true })
      .eq("id", group.id);

    await supabaseAdmin.from("scan_logs").insert({
      group_id: group.id,
      scanner_id: scanner_id || null,
      result: "valid",
    });

    const { count } = await supabaseAdmin
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id);

    // Notificar push al organizador (no bloquea la respuesta)
    if (group.wedding_id) {
      const { sendPushToWeddingOrganizers } = await import("@/lib/push");
      sendPushToWeddingOrganizers(group.wedding_id, {
        title: "¡Llegó un grupo!",
        body: `${group.name} acaba de registrar su entrada${group.table_number ? ` · Mesa ${group.table_number}` : ""}`,
        url: "/scanner",
        tag: "checkin",
      });
    }

    return NextResponse.json({
      result: "valid",
      group: {
        name: group.name,
        table_number: group.table_number,
        guest_count: count || 0,
      },
      message: "Entrada confirmada",
    });
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
