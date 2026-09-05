"use client";

import Link from "next/link";

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

interface UserAvatarProps {
  name?: string;
  size?: "sm" | "md";
}

export function UserAvatar({ name = "", size = "sm" }: UserAvatarProps) {
  const initials = getInitials(name);
  const sizeClasses = size === "md" ? "w-16 h-16 text-lg" : "w-10 h-10 text-sm";

  return (
    <Link
      href="/perfil"
      className={`${sizeClasses} rounded-full bg-ink dark:bg-gold dark:text-ink text-gold flex items-center justify-center font-bold shadow-card hover:opacity-90 transition-opacity shrink-0`}
    >
      {initials}
    </Link>
  );
}
