"use client";

import { CoupleName } from "@/components/invitation/couple-name";
import { authorTone, initials } from "./format";

export interface MomentsMember {
  id: string;
  name: string;
}

interface IdentityPickerProps {
  coupleName: string;
  members: MomentsMember[];
  onPick: (member: MomentsMember) => void;
}

/** El pase es del grupo: antes de publicar, el invitado elige quién es */
export function IdentityPicker({ coupleName, members, onPick }: IdentityPickerProps) {
  return (
    <MomentsCard coupleName={coupleName}>
      <p className="font-serif text-xl text-ink">¿Quién eres?</p>
      <p className="text-xs text-slate-500 mt-1">Tu nombre aparecerá en las fotos y mensajes que compartas.</p>
      <ul className="mt-6 space-y-2.5 text-left">
        {members.map((m) => {
          const tone = authorTone(m.name);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onPick(m)}
                className="w-full flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-card transition-colors hover:border-gold/50 hover:bg-gold-faint active:scale-[0.99]"
              >
                <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${tone.avatar}`}>
                  {initials(m.name)}
                </span>
                <span className="text-sm font-semibold text-ink truncate">{m.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {members.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">Tu invitación aún no tiene invitados registrados.</p>
      )}
    </MomentsCard>
  );
}

/** Tarjeta centrada para la elección de invitado y los estados vacíos */
export function MomentsCard({ coupleName, children }: { coupleName?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#fcfaf7] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl border border-gold/20 bg-white px-7 py-10 shadow-lift text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-gold-deep font-semibold">Momentos</p>
        {coupleName && (
          <h1 className="font-script text-4xl text-ink mt-2">
            <CoupleName name={coupleName} />
          </h1>
        )}
        <span className="block mx-auto my-6 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
        {children}
      </div>
    </div>
  );
}
