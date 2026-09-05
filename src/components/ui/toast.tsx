"use client";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-24 inset-x-0 z-[60] flex justify-center px-6 pointer-events-none">
      <div className="bg-ink dark:bg-gold dark:text-ink text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lift flex items-center gap-2 animate-toast-in">
        <svg className="w-4 h-4 text-gold dark:text-ink shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        {message}
      </div>
    </div>
  );
}
