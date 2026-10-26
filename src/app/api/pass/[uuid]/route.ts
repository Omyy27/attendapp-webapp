import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { coupleInitials, formatEventDate, formatGuestNames, formatLongDate, formatTime } from "@/lib/event-format";

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
    const MODE_FIELD = `,
          confirmation_mode`;
    const CEREMONY_FIELDS = `,
          ceremony_name,
          ceremony_address,
          ceremony_city,
          ceremony_country,
          ceremony_lat,
          ceremony_lng,
          ceremony_date,
          ceremony_time,
          reception_time`;
    const COVER_FIELD = `,
          cover_initials`;
    const GIFT_FIELD = `,
          gift_message`;
    const MOMENTS_FIELD = `,
          moments_enabled`;
    // El select se arma en tiempo de ejecución: se tipa a mano el resultado
    type GroupRow = { id: string; name: string; table_number: number | null; weddings: unknown };
    type GroupResult = { data: GroupRow | null; error: { message: string } | null };
    const query = (fields: string) =>
      supabaseAdmin
        .from("guest_groups")
        .select(`id, name, table_number, weddings (${fields})`)
        .eq("pass_uuid", uuid)
        .single() as unknown as Promise<GroupResult>;

    // Si una migración aún no se ejecutó (006 ceremonia, 005 modo de confirmación,
    // 003 lugar sorpresa), faltan columnas: se va quitando la función más reciente
    // hasta que la consulta funcione, en vez de romper todos los pases.
    const FIELD_GROUPS = [BASE_FIELDS, REVEAL_FIELDS, MODE_FIELD, CEREMONY_FIELDS, COVER_FIELD, GIFT_FIELD, MOMENTS_FIELD];
    const MISSING_COLUMN = /reveal_|confirmation_mode|ceremony_|reception_time|cover_initials|gift_message|moments_enabled/;
    let { data: group, error: groupError } = await query(FIELD_GROUPS.join(""));
    for (let n = FIELD_GROUPS.length - 1; n >= 1 && groupError; n--) {
      if (!MISSING_COLUMN.test(groupError.message || "")) break;
      ({ data: group, error: groupError } = await query(FIELD_GROUPS.slice(0, n).join("")));
    }

    if (groupError || !group) {
      return NextResponse.json({ error: "Pass not found" }, { status: 404 });
    }

    // Invitados de la invitación, en el orden en que se registraron
    const { data: groupGuests } = await supabaseAdmin
      .from("guests")
      .select("first_name, last_name")
      .eq("group_id", group.id)
      .order("created_at");
    const count = groupGuests?.length ?? 0;

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
      confirmation_mode?: "in_app" | "organizer";
      ceremony_name?: string | null;
      ceremony_address?: string | null;
      ceremony_city?: string | null;
      ceremony_country?: string | null;
      ceremony_lat?: number | null;
      ceremony_lng?: number | null;
      ceremony_date?: string | null;
      ceremony_time?: string | null;
      reception_time?: string | null;
      cover_initials?: boolean | null;
      gift_message?: string | null;
      moments_enabled?: boolean | null;
    };

    // Lugar sorpresa: el servidor decide qué lugar entregar. Antes de confirmar
    // solo sale el lugar público; los campos `reveal_*` nunca viajan al cliente.
    const guestCount = count || 0;
    const confirmMode = wedding.confirmation_mode === "organizer" ? "organizer" : "in_app";
    // in_app: confirma todo el grupo a la vez. organizer: el organizador marca
    // invitados uno a uno, así que basta con que haya al menos uno confirmado.
    const confirmed =
      confirmMode === "organizer"
        ? (confirmedCount || 0) > 0
        : guestCount > 0 && (confirmedCount || 0) >= guestCount;
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

    // Ceremonia (opcional): lugar, fecha y hora. Sin fecha propia usa la del evento.
    const ceremonyAddress = [
      wedding.ceremony_address,
      wedding.ceremony_city,
      wedding.ceremony_country,
    ]
      .filter(Boolean)
      .join(", ");
    const ceremony = wedding.ceremony_name
      ? {
          name: wedding.ceremony_name,
          address: ceremonyAddress,
          lat: wedding.ceremony_lat ?? null,
          lng: wedding.ceremony_lng ?? null,
          date: formatLongDate(wedding.ceremony_date) || formatEventDate(wedding.event_date, true),
          time: formatTime(wedding.ceremony_time),
        }
      : null;
    const fullAddress = [venue.address, venue.city, venue.country]
      .filter(Boolean)
      .join(", ");

    return NextResponse.json(
      {
        group_name: group.name,
        // "Para …" de la invitación: los nombres de sus invitados, no el grupo familiar
        addressed_to: formatGuestNames(groupGuests || []) || group.name,
        table_number: group.table_number,
        guest_count: guestCount,
        confirmed_count: confirmedCount || 0,
        // Hora de la recepción (lugar de después de la ceremonia)
        event_time: formatTime(wedding.reception_time) || "17:00 hrs",
        ceremony,
        dress_code: wedding.dress_code || "Formal / Gala",
        venue_name: venue.name,
        venue_address: fullAddress || venue.address || "",
        venue_lat: venue.lat,
        venue_lng: venue.lng,
        couple_name: wedding.couple_name,
        // Iniciales para el sobre y la previa (null = mostrar el nombre completo)
        couple_initials: wedding.cover_initials ? coupleInitials(wedding.couple_name) : null,
        event_date: formatEventDate(wedding.event_date) + (fullAddress ? ` \u00b7 ${fullAddress}` : ""),
        confirmed,
        confirm_mode: confirmMode,
        reveal_enabled: revealEnabled,
        venue_revealed: revealed,
        reveal_message: revealed ? wedding.reveal_message ?? null : null,
        gift_message: wedding.gift_message ?? null,
        moments_enabled: !!wedding.moments_enabled,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Pass fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
