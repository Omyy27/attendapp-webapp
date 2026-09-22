"use client";

import { memo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface GuestGroup {
  id: string;
  name: string;
  table_number: number;
  guest_count: number;
  pass_uuid: string;
  pass_sent: boolean;
  pass_sent_via?: "whatsapp" | "email" | "link";
  pass_sent_at?: string;
  pass_opened_at?: string;
}

interface DispatchCardProps {
  group: GuestGroup;
  onWhatsApp?: () => void;
  onEmail?: () => void;
  onCopyLink?: () => void;
  onResend?: () => void;
}

function getStatusBadge(group: GuestGroup) {
  if (!group.pass_sent) {
    return <Badge variant="warning">Sin enviar</Badge>;
  }
  if (group.pass_opened_at) {
    return (
      <Badge variant="info">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
        </svg>
        Visto
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      Enviado
    </Badge>
  );
}

export const DispatchCard = memo(function DispatchCard({
  group,
  onWhatsApp,
  onEmail,
  onCopyLink,
  onResend,
}: DispatchCardProps) {
  const initials = group.name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="bg-card rounded-xl border border-line shadow-card p-4">
      <div className="flex items-center gap-3">
        <Avatar initials={initials} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-content truncate">{group.name}</h3>
          <p className="text-xs text-muted mt-0.5">
            {group.guest_count} invitados · Mesa {group.table_number}
          </p>
          <p className="text-[11px] text-muted-soft font-mono mt-1 truncate">
            Código {group.pass_uuid.slice(0, 4)}-{group.pass_uuid.slice(4, 8)}-…-{group.pass_uuid.slice(-4)}
          </p>
        </div>
        {getStatusBadge(group)}
      </div>

      {!group.pass_sent ? (
        <div className="flex gap-2 mt-3.5 pl-14">
          <button
            onClick={onWhatsApp}
            className="flex-1 bg-emerald-50 text-emerald-700 rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={onEmail}
            className="flex-1 bg-field text-content-soft rounded-lg py-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-line-strong/60 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Correo
          </button>
          <button
            onClick={onCopyLink}
            className="w-11 bg-field text-muted rounded-lg flex items-center justify-center hover:bg-line-strong/60 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="mt-3 pl-14 space-y-2.5">
          <p className="text-[11px] text-muted-soft">
            {group.pass_sent_via === "whatsapp" ? "Enviado por WhatsApp" : group.pass_sent_via === "email" ? "Enviado por correo" : "Link copiado"}
            {group.pass_sent_at && ` · ${new Date(group.pass_sent_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onResend}
              className="flex-1 bg-ink dark:bg-gold dark:text-ink text-white rounded-lg py-2 px-2 text-xs font-semibold hover:bg-ink-light dark:hover:bg-gold-deep transition-colors"
            >
              Reenviar invitación
            </button>
            <button
              onClick={onCopyLink}
              className="flex-1 bg-field text-content-soft rounded-lg py-2 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-line-strong/60 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Copiar enlace
            </button>
          </div>
        </div>
      )}
    </article>
  );
});
