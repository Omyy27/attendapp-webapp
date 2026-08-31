"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface EditGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestUpdated: () => void;
  guest: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
    group_id: string;
  } | null;
}

interface GuestGroupOption {
  id: string;
  name: string;
  table_number: number | null;
}

export function EditGuestModal({
  isOpen,
  onClose,
  onGuestUpdated,
  guest,
}: EditGuestModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groups, setGroups] = useState<GuestGroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (isOpen && guest) {
      setFirstName(guest.first_name);
      setLastName(guest.last_name);
      setPhone(guest.phone || "");
      setEmail(guest.email || "");
      setSelectedGroupId(guest.group_id);
      fetchGroups();
    }
  }, [isOpen, guest]);

  async function fetchGroups() {
    const { data } = await supabase
      .from("guest_groups")
      .select("id, name, table_number")
      .order("name");

    setGroups(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guest) return;

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("guests")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          group_id: selectedGroupId,
        })
        .eq("id", guest.id);

      if (updateError) throw updateError;

      onGuestUpdated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !guest) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative max-w-md w-full mx-auto bg-white rounded-t-3xl shadow-[0_-10px_40px_-12px_rgba(10,37,64,.2)] p-6 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <h3 className="font-serif text-lg text-ink mb-1">Editar Invitado</h3>
        <p className="text-xs text-slate-500 mb-4">
          Modifica los datos del invitado
        </p>

        {error && (
          <div className="bg-rose-50 text-rose-600 text-xs font-medium px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Nombre *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sofia"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-base text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/10"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">
                Apellido *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Alatorre"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-base text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Telefono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 1234 5678"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Correo electronico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Grupo familiar
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-base text-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.table_number ? `(Mesa ${g.table_number})` : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white rounded-xl py-3 text-sm font-semibold shadow-lift hover:bg-ink-light transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
