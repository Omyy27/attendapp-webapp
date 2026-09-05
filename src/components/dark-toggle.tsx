"use client";

import { useTheme } from "@/lib/use-theme";

export function DarkToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 bg-card border border-line-strong rounded-xl p-1 shadow-card">
      {([
        { value: "light" as const, icon: "☀️", label: "Claro" },
        { value: "system" as const, icon: "💻", label: "Sistema" },
        { value: "dark" as const, icon: "🌙", label: "Oscuro" },
      ]).map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            theme === opt.value
              ? "bg-ink text-white dark:bg-gold dark:text-ink shadow-lift"
              : "text-muted hover:bg-field"
          }`}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
