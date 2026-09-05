"use client";

import { useTheme } from "@/lib/use-theme";

export function DarkToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-card">
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
              ? "bg-ink text-white shadow-lift"
              : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
