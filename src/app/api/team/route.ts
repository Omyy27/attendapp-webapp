import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifyUser(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split("; ").filter(Boolean).map((c) => {
      const idx = c.indexOf("=");
      return [c.substring(0, idx), c.substring(idx + 1)];
    })
  );

  const token = cookies["sb-access-token"] || cookies["sb-glwoktgliglzowgsipc-auth-token"];
  if (!token) return null;

  // Use admin getUser to verify token server-side
  const { data } = await supabaseAdmin.auth.getUser(token);
  return data.user || null;
}

// GET: listar porteros del evento
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: organizer } = await supabaseAdmin
      .from("organizers")
      .select("wedding_id, role")
      .eq("user_id", user.id)
      .single();

    if (!organizer || organizer.role !== "organizer") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { data: staff } = await supabaseAdmin
      .from("organizers")
      .select("id, name, email, role")
      .eq("wedding_id", organizer.wedding_id)
      .eq("role", "scanner");

    return NextResponse.json({ staff: staff || [] });
  } catch (error) {
    console.error("Team GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: crear portero
export async function POST(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: organizer } = await supabaseAdmin
      .from("organizers")
      .select("wedding_id, role")
      .eq("user_id", user.id)
      .single();

    if (!organizer || organizer.role !== "organizer") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    // Verificar si el email ya tiene una cuenta de auth
    let userId: string;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      const { data: existingMember } = await supabaseAdmin
        .from("organizers")
        .select("id")
        .eq("user_id", userId)
        .eq("wedding_id", organizer.wedding_id)
        .single();

      if (existingMember) {
        return NextResponse.json({ error: "Este usuario ya es parte del equipo" }, { status: 409 });
      }
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError || !newUser?.user) {
        return NextResponse.json({ error: "Error al crear la cuenta: " + (createError?.message || "desconocido") }, { status: 500 });
      }
      userId = newUser.user.id;
    }

    const { error: insertError } = await supabaseAdmin
      .from("organizers")
      .insert({
        user_id: userId,
        name: name || email.split("@")[0],
        email,
        role: "scanner",
        wedding_id: organizer.wedding_id,
      });

    if (insertError) {
      return NextResponse.json({ error: "Error al agregar al equipo" }, { status: 500 });
    }

    return NextResponse.json({
      result: "created",
      message: `Portero ${name || email} agregado al equipo`,
    });
  } catch (error) {
    console.error("Team POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: eliminar portero
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: organizer } = await supabaseAdmin
      .from("organizers")
      .select("wedding_id, role")
      .eq("user_id", user.id)
      .single();

    if (!organizer || organizer.role !== "organizer") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { data: staffMember } = await supabaseAdmin
      .from("organizers")
      .select("id, role")
      .eq("id", id)
      .eq("wedding_id", organizer.wedding_id)
      .single();

    if (!staffMember || staffMember.role !== "scanner") {
      return NextResponse.json({ error: "No encontrado o no es portero" }, { status: 404 });
    }

    await supabaseAdmin.from("organizers").delete().eq("id", id);

    return NextResponse.json({ result: "deleted" });
  } catch (error) {
    console.error("Team DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
