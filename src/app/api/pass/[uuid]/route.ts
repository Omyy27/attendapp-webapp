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

    const BASE_FIELDS = `
          couple_name,
          event_date,
          venue_name,
          venue_address,
          venue_city,
          venue_country,
          venue_lat,
          venue_lng,
          dress_code`;
    const REVEAL_FIELDS = `,
          reveal_venue_name,
          reveal_venue_address,
          reveal_venue_city,
          reveal_venue_country,
          reveal_venue_lat,
          reveal_venue_lng,
          reveal_message`;
    // El select se arma en tiempo de ejecución: se tipa a mano el resultado
    type GroupRow = { id: string; name: string; table_number: number | null; weddings: unknown };
    type GroupResult = { data: GroupRow | null; error: { message: string } | null };
    const query = (fields: string) =>
      supabaseAdmin
        .from("guest_groups")
        .select(`id, name, table_number, weddings (${fields})`)
        .eq("pass_uuid", uuid)
        .single() as unknown as Promise<GroupResult>;

    let { data: group, error: groupError } = await query(BASE_FIELDS + REVEAL_FIELDS);
    // Si la migración 003 (lugar sorpresa) aún no se ejecutó, las columnas no
    // existen: se responde sin la función en vez de romper todos los pases.
    if (groupError && /reveal_/.test(groupError.message || "")) {
      ({ data: group, error: groupError } = await query(BASE_FIELDS));
    }

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
      .in("status", ["confirmed", "checked_in"]);

    const wedding = group.weddings as unknown as {
      couple_name: string;
      event_date: string;
      venue_name: string;
      venue_address: string | null;
      venue_city: string | null;
      venue_country: string | null;
      venue_lat: number;
      venue_lng: number;
      dress_code: string;
      reveal_venue_name?: string | null;
      reveal_venue_address?: string | null;
      reveal_venue_city?: string | null;
      reveal_venue_country?: string | null;
      reveal_venue_lat?: number | null;
      reveal_venue_lng?: number | null;
      reveal_message?: string | null;
    };

    // Lugar sorpresa: el servidor decide qué lugar entregar. Antes de confirmar
    // solo sale el lugar público; los campos `reveal_*` nunca viajan al cliente.
    const guestCount = count || 0;
    const confirmed = guestCount > 0 && (confirmedCount || 0) >= guestCount;
    const revealEnabled = !!wedding.reveal_venue_name;
    const revealed = revealEnabled && confirmed;

    const venue = revealed
      ? {
          name: wedding.reveal_venue_name as string,
          address: wedding.reveal_venue_address,
          city: wedding.reveal_venue_city,
          country: wedding.reveal_venue_country,
          lat: wedding.reveal_venue_lat,
          lng: wedding.reveal_venue_lng,
        }
      : {
          name: wedding.venue_name,
          address: wedding.venue_address,
          city: wedding.venue_city,
          country: wedding.venue_country,
          lat: wedding.venue_lat,
          lng: wedding.venue_lng,
        };

    const eventDate = new Date(wedding.event_date);
    const fullAddress = [venue.address, venue.city, venue.country]
      .filter(Boolean)
      .join(", ");

    return NextResponse.json(
      {
        group_name: group.name,
        table_number: group.table_number,
        guest_count: guestCount,
        confirmed_count: confirmedCount || 0,
        event_time: "17:00 hrs",
        dress_code: wedding.dress_code || "Formal / Gala",
        venue_name: venue.name,
        venue_address: fullAddress || venue.address || "",
        venue_lat: venue.lat,
        venue_lng: venue.lng,
        couple_name: wedding.couple_name,
        event_date: eventDate.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }) + (fullAddress ? ` \u00b7 ${fullAddress}` : ""),
        reveal_enabled: revealEnabled,
        venue_revealed: revealed,
        reveal_message: revealed ? wedding.reveal_message ?? null : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Pass fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
