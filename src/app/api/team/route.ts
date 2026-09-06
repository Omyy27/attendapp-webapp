import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  canChangeRole,
  canDeleteMember,
  canManageEvent,
  canManageUsers,
  creatableRoles,
  isValidRole,
  roleLabel,
} from "@/lib/roles";

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

async function getActor(userId: string) {
  const { data: organizer } = await supabaseAdmin
    .from("organizers")
    .select("id, wedding_id, role")
    .eq("user_id", userId)
    .single();

  return organizer as { id: string; wedding_id: string; role: string } | null;
}

// GET: listar equipo del evento
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const actor = await getActor(user.id);
    if (!actor || !canManageEvent(actor.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { data: staff } = await supabaseAdmin
      .from("organizers")
      .select("id, user_id, name, email, role")
      .eq("wedding_id", actor.wedding_id)
      .order("name");

    return NextResponse.json({ staff: staff || [], myId: actor.id });
  } catch (error) {
    console.error("Team GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: crear miembro del equipo (portero, organizador o admin)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const actor = await getActor(user.id);
    if (!actor || !canManageEvent(actor.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { name, email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña son requeridos" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    if (!creatableRoles(actor.role).includes(role)) {
      return NextResponse.json({ error: "No puedes crear ese rol" }, { status: 403 });
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
        .eq("wedding_id", actor.wedding_id)
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
        role,
        wedding_id: actor.wedding_id,
      });

    if (insertError) {
      return NextResponse.json({ error: "Error al agregar al equipo" }, { status: 500 });
    }

    return NextResponse.json({
      result: "created",
      message: `${roleLabel(role)} ${name || email} agregado al equipo`,
    });
  } catch (error) {
    console.error("Team POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: eliminar miembro del equipo
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const actor = await getActor(user.id);
    if (!actor || !canManageEvent(actor.role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { data: staffMember } = await supabaseAdmin
      .from("organizers")
      .select("id, role")
      .eq("id", id)
      .eq("wedding_id", actor.wedding_id)
      .single();

    if (!staffMember) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    if (!canDeleteMember(actor.role, staffMember.role, staffMember.id === actor.id)) {
      return NextResponse.json({ error: "No puedes eliminar a este miembro" }, { status: 403 });
    }

    await supabaseAdmin.from("organizers").delete().eq("id", id);

    return NextResponse.json({ result: "deleted" });
  } catch (error) {
    console.error("Team DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: cambiar el rol de un miembro (solo admin)
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const actor = await getActor(user.id);
    if (!actor || !canManageUsers(actor.role)) {
      return NextResponse.json({ error: "Solo un administrador puede cambiar roles" }, { status: 403 });
    }

    const { id, role } = await request.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const { data: staffMember } = await supabaseAdmin
      .from("organizers")
      .select("id, role")
      .eq("id", id)
      .eq("wedding_id", actor.wedding_id)
      .single();

    if (!staffMember) {
      return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    if (!canChangeRole(actor.role, staffMember.id === actor.id)) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 403 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("organizers")
      .update({ role })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "Error al cambiar el rol" }, { status: 500 });
    }

    return NextResponse.json({ result: "updated" });
  } catch (error) {
    console.error("Team PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
