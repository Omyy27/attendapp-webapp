import { createClient } from "@/lib/supabase/server";

export interface Wedding {
  id: string;
  title: string;
  couple_name: string;
  event_date: string;
  venue_name: string | null;
  venue_address: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  dress_code: string | null;
}

export interface GuestGroup {
  id: string;
  wedding_id: string;
  name: string;
  table_number: number | null;
  pass_uuid: string;
  pass_sent: boolean;
  pass_sent_via: string | null;
  pass_sent_at: string | null;
  pass_opened_at: string | null;
  guest_count?: number;
}

export interface Guest {
  id: string;
  group_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: "pending" | "confirmed" | "checked_in";
  checked_in_at: string | null;
  checked_in_method: string | null;
  group?: GuestGroup;
}

export interface Organizer {
  id: string;
  user_id: string;
  name: string;
  email: string;
  wedding_id: string | null;
  role: string;
}

export interface ScanLog {
  id: string;
  group_id: string;
  scanner_id: string | null;
  result: "valid" | "already_used" | "invalid";
  scanned_at: string;
}

export async function getOrCreateWedding(): Promise<Wedding | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: organizer } = await supabase
    .from("organizers")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!organizer) {
    const { data: newOrg } = await supabase
      .from("organizers")
      .insert({
        user_id: user.id,
        name: user.email?.split("@")[0] || "Organizador",
        email: user.email || "",
        role: "organizer",
      })
      .select()
      .single();
    organizer = newOrg;
  }

  if (!organizer) return null;

  if (organizer.wedding_id) {
    const { data: wedding } = await supabase
      .from("weddings")
      .select("*")
      .eq("id", organizer.wedding_id)
      .single();
    return wedding;
  }

  const { data: wedding } = await supabase
    .from("weddings")
    .insert({
      title: "Mi Boda",
      couple_name: "Novia & Novio",
      event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      venue_name: "Salon de eventos",
      venue_address: "Direccion pendiente",
    })
    .select()
    .single();

  if (wedding) {
    await supabase
      .from("organizers")
      .update({ wedding_id: wedding.id })
      .eq("id", organizer.id);
  }

  return wedding;
}
