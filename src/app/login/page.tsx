"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { canManageEvent } from "@/lib/roles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      setLoading(false);
      return;
    }

    // Verificar rol del usuario para redirigir
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: organizer } = await supabase
        .from("organizers")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!canManageEvent(organizer?.role)) {
        router.push("/scanner");
      } else {
        router.push("/");
      }
    } else {
      router.push("/");
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="w-16 h-16 rounded-2xl bg-ink text-gold flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
          <h1 className="font-serif text-2xl text-content">Attendapp</h1>
          <p className="text-sm text-muted mt-1">Administra tu evento</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-content-soft mb-1.5 block">
              Correo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="organizador@correo.com"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20 shadow-card"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-content-soft mb-1.5 block">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-card border border-line-strong rounded-xl px-4 py-3 text-base text-content placeholder:text-muted-soft focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20 shadow-card"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink dark:bg-gold dark:text-ink text-white rounded-xl py-3 text-sm font-semibold shadow-lift hover:bg-ink-light dark:hover:bg-gold-deep transition-colors disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
