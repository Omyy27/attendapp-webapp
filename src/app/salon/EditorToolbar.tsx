"use client";

import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  variant?: "sidebar" | "floating";
  onAdd: () => void;
  onDelete?: () => void;
  selectedNumber?: number;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

const iconPlus = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const iconTrash = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const iconZoomIn = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const iconZoomOut = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="8" y1="11" x2="14" y2="11" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const iconZoomReset = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

function ToolButton({
  onClick,
  title,
  active,
  danger,
  children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150",
        danger
          ? "bg-field text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
          : active
            ? "bg-ink dark:bg-gold dark:text-ink text-white shadow-card"
            : "bg-field text-content-soft hover:bg-line-strong/60 hover:text-content"
      )}
    >
      {children}
    </button>
  );
}

interface DividerProps {
  className?: string;
}

function Divider({ className = "" }: DividerProps) {
  return <div className={cn("bg-line-strong/60", className)} />;
}

export function EditorToolbar({
  variant = "floating",
  onAdd,
  onDelete,
  selectedNumber,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: EditorToolbarProps) {
  const zoomDisabled = zoom <= 0.5;
  const zoomInDisabled = zoom >= 2;

  if (variant === "sidebar") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <ToolButton onClick={onAdd} title="Agregar mesa">
          {iconPlus}
        </ToolButton>

        {onDelete && (
          <ToolButton onClick={onDelete} title={`Eliminar mesa ${selectedNumber ?? ""}`} danger>
            {iconTrash}
          </ToolButton>
        )}

        <Divider className="w-6 h-px my-1" />

        <ToolButton onClick={onZoomIn} title="Acercar" active={!zoomInDisabled}>
          {iconZoomIn}
        </ToolButton>
        <ToolButton onClick={onZoomOut} title="Alejar" active={!zoomDisabled}>
          {iconZoomOut}
        </ToolButton>
        <ToolButton onClick={onZoomReset} title="Restablecer zoom">
          {iconZoomReset}
        </ToolButton>

        <div className="mt-auto text-[10px] font-semibold text-muted-soft tabular-nums">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    );
  }

  // Floating variant (mobile)
  return (
    <div className="fixed bottom-20 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div className="flex items-center gap-1.5 bg-card border border-line-strong rounded-2xl shadow-[0_-4px_24px_-4px_rgba(10,37,64,.15)] px-3 py-2 pointer-events-auto">
        <button
          onClick={onAdd}
          className="w-10 h-10 rounded-xl bg-ink dark:bg-gold dark:text-ink text-white flex items-center justify-center shadow-card hover:bg-ink-light transition-colors"
          title="Agregar mesa"
        >
          {iconPlus}
        </button>

        {onDelete && (
          <button
            onClick={onDelete}
            className="w-10 h-10 rounded-xl bg-field text-rose-500 flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            title={`Eliminar mesa ${selectedNumber ?? ""}`}
          >
            {iconTrash}
          </button>
        )}

        <Divider className="w-px h-6 mx-0.5" />

        <button
          onClick={onZoomOut}
          disabled={zoomDisabled}
          className="w-10 h-10 rounded-xl bg-field text-content-soft flex items-center justify-center hover:bg-line-strong/60 transition-colors disabled:opacity-40"
          title="Alejar"
        >
          {iconZoomOut}
        </button>
        <span className="text-[11px] font-semibold text-content-soft tabular-nums w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          disabled={zoomInDisabled}
          className="w-10 h-10 rounded-xl bg-field text-content-soft flex items-center justify-center hover:bg-line-strong/60 transition-colors disabled:opacity-40"
          title="Acercar"
        >
          {iconZoomIn}
        </button>
        <button
          onClick={onZoomReset}
          className="w-10 h-10 rounded-xl bg-field text-content-soft flex items-center justify-center hover:bg-line-strong/60 transition-colors"
          title="Restablecer zoom"
        >
          {iconZoomReset}
        </button>

        {selectedNumber && (
          <span className="text-xs font-semibold text-content-soft px-2 border-l border-line-strong">
            Mesa {selectedNumber}
          </span>
        )}
      </div>
    </div>
  );
}
