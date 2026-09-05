import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    if (!uuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    const { data: group, error: groupError } = await supabaseAdmin
      .from("guest_groups")
      .select(`
        id,
        name,
        table_number,
        weddings (
          couple_name,
          event_date,
          venue_name,
          venue_address,
          venue_lat,
          venue_lng,
          dress_code
        )
      `)
      .eq("pass_uuid", uuid)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }

    const { count } = await supabaseAdmin
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id);

    const { count: confirmedCount } = await supabaseAdmin
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id)
      .neq("status", "pending");

    const wedding = group.weddings as unknown as {
      couple_name: string;
      event_date: string;
      venue_name: string;
      venue_address: string;
      venue_lat: number;
      venue_lng: number;
      dress_code: string;
    };

    const eventDate = new Date(wedding.event_date);

    return NextResponse.json({
      group_name: group.name,
      table_number: group.table_number,
      guest_count: count || 0,
      confirmed_count: confirmedCount || 0,
      event_time: "17:00 hrs",
      dress_code: wedding.dress_code || "Formal / Gala",
      venue_name: wedding.venue_name,
      venue_address: wedding.venue_address,
      venue_lat: wedding.venue_lat,
      venue_lng: wedding.venue_lng,
      couple_name: wedding.couple_name,
      event_date: eventDate.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + (wedding.venue_address ? ` \u00b7 ${wedding.venue_address.split(",").pop()?.trim() || ""}` : ""),
    });
  } catch (error) {
    console.error("Pass fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
