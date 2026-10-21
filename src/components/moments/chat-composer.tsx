"use client";

import { useRef, useState } from "react";
import { CameraIcon, SendIcon } from "./icons";

interface ChatComposerProps {
  maxLength: number;
  /** Devuelve false si no se pudo enviar (el texto se conserva) */
  onSend: (text: string) => Promise<boolean>;
  onAddPhotos: () => void;
  uploading: boolean;
  /** Aviso corto sobre el composer (subidas, errores) */
  notice?: string | null;
}

export function ChatComposer({ maxLength, onSend, onAddPhotos, uploading, notice }: ChatComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 0 && !sending;

  async function submit() {
    if (!canSend) return;
    const value = text.trim();
    setSending(true);
    setText("");
    const ok = await onSend(value);
    if (!ok) setText(value);
    setSending(false);
    inputRef.current?.focus();
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-gold/20">
      <div className="max-w-md mx-auto px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {notice && (
          <p className="mb-2 text-center text-xs font-medium text-gold-deep" aria-live="polite">
            {notice}
          </p>
        )}
        <form
          className="flex items-end gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <button
            type="button"
            onClick={onAddPhotos}
            disabled={uploading}
            className="w-11 h-11 rounded-full bg-gold-faint text-gold-deep border border-gold/30 flex items-center justify-center shrink-0 hover:bg-gold/10 transition-colors disabled:opacity-50"
            aria-label="Subir fotos"
          >
            <CameraIcon className="w-5 h-5" />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxLength))}
            onKeyDown={(e) => {
              // Enter envía en escritorio; Shift+Enter hace salto de línea
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Escribe un mensaje…"
            aria-label="Mensaje"
            className="flex-1 min-w-0 min-h-11 max-h-32 resize-none bg-slate-50 border border-slate-200 rounded-3xl px-5 py-2.5 text-base text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky/30 focus:border-sky/40 [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="w-11 h-11 rounded-full bg-ink text-gold flex items-center justify-center shrink-0 shadow-lift hover:bg-ink-light transition-colors disabled:opacity-40"
            aria-label="Enviar"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
