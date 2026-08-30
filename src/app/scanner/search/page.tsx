"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";

interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  table_number: number;
  group_name: string;
  guest_count: number;
  status: "pending" | "checked_in";
}

export default function BackupSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<{ name: string; time: string } | null>(null);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: organizer } = await supabase
        .from("organizers")
        .select("wedding_id")
        .eq("user_id", user.id)
        .single();

      if (organizer?.wedding_id) {
        setWeddingId(organizer.wedding_id);
      }
    }
    init();
  }, [supabase]);

  const searchGuests = useCallback(async (searchQuery: string) => {
    if (!weddingId || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);

    const { data: groups } = await supabase
      .from("guest_groups")
      .select("id, name, table_number")
      .eq("wedding_id", weddingId);

    if (!groups || groups.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }

    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const groupIds = groups.map((g) => g.id);

    const { data: guests } = await supabase
      .from("guests")
      .select("*")
      .in("group_id", groupIds)
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
      .limit(20);

    if (!guests) {
      setResults([]);
      setSearching(false);
      return;
    }

    const mapped = guests.map((g) => {
      const group = groupMap.get(g.group_id);
      return {
        id: g.id,
        first_name: g.first_name,
        last_name: g.last_name,
        table_number: group?.table_number || 0,
        group_name: group?.name || "",
        guest_count: 0,
        status: g.status || "pending",
      };
    });

    setResults(mapped);
    setSearching(false);
  }, [weddingId, supabase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchGuests(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchGuests]);

  async function handleCheckin(guestId: string, name: string) {
    await supabase
      .from("guests")
      .update({ status: "checked_in" })
      .eq("id", guestId);

    const { data: guest } = await supabase
      .from("guests")
      .select("group_id")
      .eq("id", guestId)
      .single();

    if (guest?.group_id) {
      await supabase.from("scan_logs").insert({
        group_id: guest.group_id,
        guest_id: guestId,
        result: "valid",
        scan_type: "manual",
      });
    }

    setLastCheckin({
      name,
      time: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
    });

    searchGuests(query);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="max-w-md mx-auto min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-5 pb-4 border-b border-slate-200/70">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/scanner"
              className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-card shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </Link>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                Alternativa
              </p>
              <h1 className="font-serif text-lg leading-none text-ink">Buscar por nombre</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre y apellido..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-10 py-3.5 text-sm text-ink placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky/40 focus:border-sky/40"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setResults([]); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Explainer */}
        <section className="px-5 pt-4">
          <div className="flex items-start gap-2.5 bg-sky/5 border border-sky/20 rounded-xl p-3.5">
            <svg className="w-5 h-5 text-sky shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <p className="text-xs text-slate-600 leading-relaxed">
              Usalo cuando un invitado no tenga acceso a su QR. Busca por nombre y marca su
              entrada manualmente — queda registrado igual que un escaneo.
            </p>
          </div>
        </section>

        {/* Results */}
        <section className="px-5 pt-4">
          {query.length >= 2 && (
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
              {searching ? "Buscando..." : `${results.length} resultado${results.length !== 1 ? "s" : ""} para "${query}"`}
            </p>
          )}

          <div className="space-y-2.5">
            {results.map((result) => (
              <article
                key={result.id}
                className={`bg-white border border-slate-100 rounded-xl p-3.5 shadow-card flex items-center gap-3 ${
                  result.status === "checked_in" ? "opacity-90" : ""
                }`}
              >
                <Avatar
                  initials={`${result.first_name.charAt(0)}${result.last_name.charAt(0)}`}
                  variant={result.status === "checked_in" ? "emerald" : "gold"}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">
                    {result.first_name} {result.last_name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mesa {result.table_number} · {result.group_name}
                  </p>
                </div>
                {result.status === "pending" ? (
                  <button
                    onClick={() => handleCheckin(result.id, `${result.first_name} ${result.last_name}`)}
                    className="bg-ink text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg whitespace-nowrap hover:bg-ink-light transition-colors shrink-0"
                  >
                    Registrar llegada
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full whitespace-nowrap flex items-center gap-1 shrink-0">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    Ya llegó
                  </span>
                )}
              </article>
            ))}
          </div>

          {query.length >= 2 && !searching && results.length === 0 && (
            <div className="text-center py-10">
              <p className="text-sm text-slate-500">No se encontraron invitados</p>
              <p className="text-xs text-slate-400 mt-1">Intenta con otro nombre</p>
            </div>
          )}

          {query.length < 2 && (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400">Escribe al menos 2 letras para buscar</p>
            </div>
          )}
        </section>

        {/* Last check-in */}
        {lastCheckin && (
          <section className="px-5 pt-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
              Ultimo registro manual
            </p>
            <div className="bg-emerald-500 rounded-2xl shadow-lift p-4 flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm leading-tight">Entrada confirmada</p>
                <p className="text-white/85 text-xs font-medium truncate">
                  {lastCheckin.name} · registrado manualmente · {lastCheckin.time}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
