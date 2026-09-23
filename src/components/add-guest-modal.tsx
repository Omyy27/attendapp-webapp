"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/lib/use-supabase";

interface AddGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestAdded: () => void;
  weddingId: string;
}

interface GuestGroupOption {
  id: string;
  name: string;
  table_number: number | null;
}

export function AddGuestModal({
  isOpen,
  onClose,
  onGuestAdded,
  weddingId,
}: AddGuestModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [slots, setSlots] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTable, setNewGroupTable] = useState("");
  const [isNewGroup, setIsNewGroup] = useState(true);
  const [groups, setGroups] = useState<GuestGroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supabase = useSupabase();

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
    }
  }, [isOpen, weddingId]);

  async function fetchGroups() {
    const { data } = await supabase
      .from("guest_groups")
      .select("id, name, table_number")
      .eq("wedding_id", weddingId)
      .order("name");

    setGroups(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let groupId = selectedGroupId;

      if (isNewGroup) {
        if (!newGroupName.trim()) {
          setError("Ingresa el nombre del grupo familiar");
          setLoading(false);
          return;
        }

        const { data: newGroup, error: groupError } = await supabase
          .from("guest_groups")
          .insert({
            wedding_id: weddingId,
            name: newGroupName.trim(),
            table_number: newGroupTable ? parseInt(newGroupTable) : null,
          })
          .select()
          .single();

        if (groupError) throw groupError;
        groupId = newGroup.id;
      }

      if (!groupId) {
        setError("Selecciona o crea un grupo familiar");
        setLoading(false);
        return;
      }

      const { error: guestError } = await supabase.from("guests").insert({
        group_id: groupId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        slots: slots,
        status: "pending",
      });

      if (guestError) throw guestError;

      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setSlots(1);
      setNewGroupName("");
      setNewGroupTable("");
      setSelectedGroupId("");
      onGuestAdded();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative max-w-md w-full mx-auto bg-card rounded-t-3xl md:rounded-2xl shadow-[0_-10px_40px_-12px_rgba(10,37,64,.2)] p-6 max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-line-strong rounded-full mx-auto mb-4 hidden md:block" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 rounded-full bg-field flex items-center justify-center text-muted"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <h3 className="font-serif text-lg text-content mb-1">Agregar Invitado</h3>
        <p className="text-xs text-muted mb-4">
          Completa los datos del invitado
        </p>

        {error && (
          <div className="bg-rose-50 text-rose-600 text-xs font-medium px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-content-soft mb-1 block">
                Nombre *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Sofia"
                className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-content-soft mb-1 block">
                Apellido *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Alatorre"
                className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-content-soft mb-1 block">
              Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+52 55 1234 5678"
              className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-sm text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-content-soft mb-1 block">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-sm text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-content-soft mb-1 block">
              Cupos
            </label>
            <input
              type="number"
              value={slots}
              onChange={(e) => setSlots(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="20"
              className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-sm text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
            <p className="text-[10px] text-muted-soft mt-1">Lugares que ocupa esta invitación</p>
          </div>

          {/* Group selection */}
          <div className="border-t border-line pt-3 mt-3">
            <p className="text-xs font-semibold text-content-soft mb-2">
              Grupo familiar
            </p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setIsNewGroup(true)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
                  isNewGroup
                    ? "bg-ink text-white"
                    : "bg-field text-content-soft hover:bg-line-strong/60"
                }`}
              >
                Nuevo grupo
              </button>
              <button
                type="button"
                onClick={() => setIsNewGroup(false)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
                  !isNewGroup
                    ? "bg-ink text-white"
                    : "bg-field text-content-soft hover:bg-line-strong/60"
                }`}
              >
                Grupo existente
              </button>
            </div>

            {isNewGroup ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Familia Alatorre"
                  className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
                <input
                  type="number"
                  value={newGroupTable}
                  onChange={(e) => setNewGroupTable(e.target.value)}
                  placeholder="Número de mesa (opcional)"
                  min="1"
                  className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
              </div>
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-field border border-line-strong rounded-lg px-3 py-2.5 text-base text-content focus:outline-none focus:ring-2 focus:ring-ink/10"
              >
                <option value="">Seleccionar grupo...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.table_number ? `(Mesa ${g.table_number})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white rounded-xl py-3 text-sm font-semibold shadow-lift hover:bg-ink-light transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Guardando..." : "Agregar invitado"}
          </button>
        </form>
      </div>
    </div>
  );
}
