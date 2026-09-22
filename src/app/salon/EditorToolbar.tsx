"use client";

interface EditorToolbarProps {
  onAdd: () => void;
  onDelete?: () => void;
  selectedNumber?: number;
}

export function EditorToolbar({ onAdd, onDelete, selectedNumber }: EditorToolbarProps) {
  return (
    <div className="fixed bottom-20 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div className="flex items-center gap-2 bg-card border border-line-strong rounded-2xl shadow-[0_-4px_24px_-4px_rgba(10,37,64,.15)] px-3 py-2 pointer-events-auto">
        <button
          onClick={onAdd}
          className="w-10 h-10 rounded-xl bg-ink dark:bg-gold dark:text-ink text-white flex items-center justify-center shadow-card hover:bg-ink-light transition-colors"
          title="Agregar mesa"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {onDelete && (
          <button
            onClick={onDelete}
            className="w-10 h-10 rounded-xl bg-field text-rose-500 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            title={`Eliminar mesa ${selectedNumber ?? ""}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        )}

        {selectedNumber && (
          <span className="text-xs font-semibold text-content-soft px-2">
            Mesa {selectedNumber}
          </span>
        )}
      </div>
    </div>
  );
}
