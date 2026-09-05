import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import {
  invitationEmailHtml,
  invitationEmailSubject,
  invitationEmailText,
  type InvitationEmailData,
} from "@/lib/email-template";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { groupId } = await request.json();
    if (!groupId) {
      return NextResponse.json({ error: "groupId requerido" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Servicio de correo no configurado (RESEND_API_KEY)" },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);

    // 1. Organizador y su evento
    const { data: organizer } = await supabase
      .from("organizers")
      .select("wedding_id")
      .eq("user_id", user.id)
      .single();

    if (!organizer?.wedding_id) {
      return NextResponse.json({ error: "Sin evento" }, { status: 404 });
    }

    // 2. Grupo (verificado que es del evento)
    const { data: group } = await supabase
      .from("guest_groups")
      .select("id, name, pass_uuid")
      .eq("id", groupId)
      .eq("wedding_id", organizer.wedding_id)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    // 3. Datos del evento
    const { data: wedding } = await supabase
      .from("weddings")
      .select("couple_name, event_date, venue_name, venue_address, venue_city, dress_code")
      .eq("id", organizer.wedding_id)
      .single();

    // 4. Invitados del grupo con correo
    const { data: guests } = await supabase
      .from("guests")
      .select("first_name, email")
      .eq("group_id", group.id);

    const recipients = (guests || []).filter(
      (g): g is { first_name: string; email: string } =>
        !!g.email && g.email.includes("@")
    );

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Este grupo no tiene correos registrados", sent: 0, total: 0 },
        { status: 422 }
      );
    }

    // 5. Construir datos del correo
    const eventDate = wedding?.event_date
      ? new Date(wedding.event_date).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";
    const venueAddress = [wedding?.venue_address, wedding?.venue_city]
      .filter(Boolean)
      .join(", ");
    const origin = new URL(request.url).origin;
    const base: InvitationEmailData = {
      groupName: group.name,
      passUrl: `${origin}/pase/${group.pass_uuid}`,
      coupleName: wedding?.couple_name || "Los novios",
      eventDate,
      venueName: wedding?.venue_name || "",
      venueAddress,
      dressCode: wedding?.dress_code || "Formal",
    };

    const from = process.env.RESEND_FROM || "Attendapp <onboarding@resend.dev>";

    // 6. Enviar un correo por invitado (personalizado con su nombre)
    const results = await Promise.allSettled(
      recipients.map((guest) =>
        resend.emails.send({
          from,
          to: guest.email,
          subject: invitationEmailSubject(base),
          html: invitationEmailHtml({
            ...base,
            groupName: `${guest.first_name} (${group.name})`,
          }),
          text: invitationEmailText(base),
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    if (sent === 0) {
      return NextResponse.json(
        { error: "No se pudo enviar el correo", sent: 0, total: recipients.length },
        { status: 502 }
      );
    }

    return NextResponse.json({ sent, total: recipients.length });
  } catch (error) {
    console.error("Dispatch email error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
