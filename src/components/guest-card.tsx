"use client";

import { memo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  group_id: string;
  slots: number;
  status: "pending" | "opened" | "confirmed" | "checked_in";
  checked_in_at?: string;
  opened_at?: string | null;
  group: {
    name: string;
    table_number: number;
    pass_uuid?: string;
  };
}

interface GuestCardProps {
  guest: Guest;
  showActions?: boolean;
  onQRClick?: () => void;
  onMessageClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  /** Personas en la misma invitación, cuántas faltan y cuántas ya confirmaron */
  groupSize?: number;
  groupUnconfirmed?: number;
  groupConfirmed?: number;
  onConfirmGroup?: () => void;
  onUnconfirmGroup?: () => void;
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
    case "opened":
      return (
        <Badge variant="warning">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Abrió la carta
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="info">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Confirmado
        </Badge>
      );
    default:
      return (
        <Badge variant="default">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          Sin confirmar
        </Badge>
      );
  }
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

export const GuestCard = memo(function GuestCard({
  guest,
  showActions = true,
  onQRClick,
  onMessageClick,
  onEditClick,
  onDeleteClick,
  groupSize = 1,
  groupUnconfirmed = 0,
  groupConfirmed = 0,
  onConfirmGroup,
  onUnconfirmGroup,
}: GuestCardProps) {
  const initials = `${guest.first_name.charAt(0)}${guest.last_name.charAt(0)}`;

  const actionBase =
    "flex-1 min-w-0 h-11 rounded-lg px-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 text-[11px] font-semibold transition-colors";
  const actionIdle = "text-muted hover:bg-field";

  return (
    <article className="bg-card rounded-xl border border-line shadow-card p-4 flex flex-col gap-3 hover:shadow-lift transition-shadow">
      <div className="flex items-center gap-3">
        <Avatar
          initials={initials}
          variant={guest.status === "checked_in" ? "gold" : "slate"}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-content truncate max-w-full">
              {guest.first_name} {guest.last_name}
            </h3>
            <span className="text-[11px] text-muted-soft font-medium bg-field px-2 py-0.5 rounded-full truncate max-w-full">
              {guest.group.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
            <span className="text-xs text-muted font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full border border-gold" />
              Mesa {guest.group.table_number}
            </span>
            {(guest.slots ?? 1) > 1 && (
              <span className="text-[10px] font-semibold text-gold-deep bg-gold-faint dark:text-gold dark:bg-gold/15 px-1.5 py-0.5 rounded-full">
                {guest.slots} cupos
              </span>
            )}
            {getStatusBadge(guest.status)}
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex items-stretch gap-1 border-t border-line pt-2.5">
          <button
            onClick={onQRClick}
            className={`${actionBase} ${actionIdle} hover:text-content`}
            title="Ver QR"
            aria-label="Ver QR"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 -0.09 122.88 122.88" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M0.18,0h44.63v44.45H0.18V0z M111.5,111.5h11.38v11.2H111.5V111.5z M89.63,111.48h11.38v10.67H89.63h-0.01H78.25v-21.82h11.02V89.27h11.21V67.22h11.38v10.84h10.84v11.2h-10.84v11.2h-11.21h-0.17H89.63V111.48z M55.84,89.09h11.02v-11.2H56.2v-11.2h10.66v-11.2H56.02v11.2H44.63v-11.2h11.2V22.23h11.38v33.25h11.02v11.2h10.84v-11.2h11.38v11.2H89.63v11.2H78.25v22.05H67.22v22.23H55.84V89.09z M111.31,55.48h11.38v11.2h-11.38V55.48z M22.41,55.48h11.38v11.2H22.41V55.48z M0.18,55.48h11.38v11.2H0.18V55.48z M55.84,0h11.38v11.2H55.84V0z M0,78.06h44.63v44.45H0V78.06z M10.84,88.86h22.95v22.86H10.84V88.86z M78.06,0h44.63v44.45H78.06V0z M88.91,10.8h22.95v22.86H88.91V10.8z M11.02,10.8h22.95v22.86H11.02V10.8z" />
            </svg>
            <span>QR</span>
          </button>
          <button
            onClick={onEditClick}
            className={`${actionBase} ${actionIdle} hover:text-sky hover:bg-sky/10`}
            title="Editar"
            aria-label="Editar"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
            </svg>
            <span>Editar</span>
          </button>
          <button
            onClick={onDeleteClick}
            className={`${actionBase} ${actionIdle} hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10`}
            title="Eliminar"
            aria-label="Eliminar"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <span>Eliminar</span>
          </button>
        </div>
      )}

      {/* Confirmación por invitación: confirma (o deshace) a todos los de la invitación */}
      {showActions && groupUnconfirmed > 0 && onConfirmGroup && (
        <button
          onClick={onConfirmGroup}
          className="w-full h-10 -mt-1 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 transition-colors"
        >
          <CheckIcon />
          {groupSize > 1 ? `Confirmar invitación completa (${groupSize} personas)` : "Confirmar invitación"}
        </button>
      )}
      {showActions && groupUnconfirmed === 0 && groupConfirmed > 0 && onUnconfirmGroup && (
        <button
          onClick={onUnconfirmGroup}
          className="w-full h-10 -mt-1 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 transition-colors"
          title="Deshacer la confirmación de esta invitación"
        >
          <CheckIcon />
          Invitación confirmada
          <span className="text-muted font-medium">· Desconfirmar</span>
        </button>
      )}
    </article>
  );
});
