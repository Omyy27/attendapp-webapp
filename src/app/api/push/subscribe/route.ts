import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { endpoint, p256dh, auth } = await request.json();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Suscripción incompleta" }, { status: 400 });
    }

    await supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: user.id, endpoint, p256dh, auth },
        { onConflict: "endpoint" }
      );

    return NextResponse.json({ result: "subscribed" });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
