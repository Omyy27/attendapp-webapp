"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  group_id: string;
  status: "pending" | "confirmed" | "checked_in";
  checked_in_at?: string;
  group: {
    name: string;
    table_number: number;
    pass_uuid?: string;
  };
}

interface GuestCardProps {
  guest: Guest;
  onQRClick?: () => void;
  onMessageClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}

function getStatusBadge(status: Guest["status"]) {
  switch (status) {
    case "checked_in":
      return (
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Adentro
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="warning">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Pendiente
        </Badge>
      );
    default:
      return (
        <Badge>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          Ausente
        </Badge>
      );
  }
}

export function GuestCard({
  guest,
  onQRClick,
  onMessageClick,
  onEditClick,
  onDeleteClick,
}: GuestCardProps) {
  const initials = `${guest.first_name.charAt(0)}${guest.last_name.charAt(0)}`;

  return (
    <article className="bg-white rounded-xl border border-slate-100 shadow-card p-4 flex items-center gap-3 hover:shadow-lift transition-shadow">
      <Avatar
        initials={initials}
        variant={guest.status === "checked_in" ? "gold" : "slate"}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink truncate">
            {guest.first_name} {guest.last_name}
          </h3>
          <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full truncate">
            {guest.group.name}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full border border-gold" />
            Mesa {guest.group.table_number}
          </span>
          {getStatusBadge(guest.status)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onQRClick}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-50 flex items-center justify-center transition-colors"
          title="Ver QR"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        <button
          onClick={onEditClick}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-sky hover:bg-sky/10 flex items-center justify-center transition-colors"
          title="Editar"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          </svg>
        </button>
        <button
          onClick={onDeleteClick}
          className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
          title="Eliminar"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </article>
  );
}
