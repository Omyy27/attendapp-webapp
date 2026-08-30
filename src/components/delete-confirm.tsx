"use client";

interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  guestName: string;
  loading?: boolean;
}

export function DeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  guestName,
  loading,
}: DeleteConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-[0_-10px_40px_-12px_rgba(10,37,64,.2)] p-6 max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 className="font-serif text-lg text-ink text-center mb-2">Eliminar invitado</h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          Se eliminara a <span className="font-semibold text-ink">{guestName}</span> del padron.
          Esta accion no se puede deshacer.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-3 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-rose-500 text-white rounded-xl py-3 text-sm font-semibold hover:bg-rose-600 transition-colors disabled:opacity-50"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
