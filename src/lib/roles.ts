export type MemberRole = "organizer" | "scanner" | "admin";

export const ROLE_LABELS: Record<MemberRole, string> = {
  organizer: "Organizador",
  scanner: "Portero",
  admin: "Administrador",
};

export function roleLabel(role?: string | null): string {
  if (role === "organizer" || role === "scanner" || role === "admin") {
    return ROLE_LABELS[role];
  }
  return "Organizador";
}

/** Puede gestionar el evento: padrón CRUD, pases, ajustes, scanner */
export function canManageEvent(role?: string | null): boolean {
  return role === "organizer" || role === "admin";
}

/** Puede gestionar usuarios: crear cualquier rol, cambiar roles, eliminar miembros */
export function canManageUsers(role?: string | null): boolean {
  return role === "admin";
}

/** ¿Qué roles puede crear alguien con `creatorRole`? */
export function creatableRoles(creatorRole?: string | null): MemberRole[] {
  if (creatorRole === "admin") return ["scanner", "organizer", "admin"];
  if (creatorRole === "organizer") return ["scanner", "organizer", "admin"];
  return [];
}

/** ¿Puede `actor` eliminar a un miembro con `targetRole`? `isSelf` bloquea auto-eliminación */
export function canDeleteMember(
  actorRole?: string | null,
  targetRole?: string | null,
  isSelf = false
): boolean {
  if (isSelf) return false;
  if (actorRole === "admin") return true;
  if (actorRole === "organizer") return targetRole === "scanner";
  return false;
}

/** ¿Puede `actor` cambiar el rol de otro miembro? Nunca el propio */
export function canChangeRole(actorRole?: string | null, isSelf = false): boolean {
  if (isSelf) return false;
  return actorRole === "admin";
}

export function isValidRole(role: unknown): role is MemberRole {
  return role === "organizer" || role === "scanner" || role === "admin";
}
