"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/lib/use-supabase";
import { Badge } from "@/components/ui/badge";

type LogResult = "valid" | "already_used" | "invalid";

type LogRow = {
  id: string;
  group_id: string;
  result: LogResult;
  scanned_at: string;
  guest_groups: { name: string; table_number: number | null } | null;
};

const filters = ["Todos", "Válidos", "Ya usados", "Inválidos"] as const;

function resultBadge(result: LogResult) {
  if (result === "valid") {
    return (
      <Badge variant="success">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Válido
      </Badge>
    );
  }
  if (result === "already_used") {
    return (
      <Badge variant="warning">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Ya usado
      </Badge>
    );
  }
  return (
    <Badge variant="danger">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Inválido
    </Badge>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yesterday.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

export default function HistorialPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("Todos");
  const supabase = useSupabase();

  const fetchLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("scan_logs")
      .select("id, group_id, result, scanned_at, guest_groups(name, table_number)")
      .order("scanned_at", { ascending: false })
      .limit(200);

    setLogs((data as unknown as LogRow[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Realtime: nuevos escaneos aparecen en vivo
  useEffect(() => {
    const channel = supabase
      .channel("historial-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "scan_logs" }, async (payload) => {
        // Intentar insertar solo la fila nueva (sin refetch completo)
        const { data } = await supabase
          .from("scan_logs")
          .select("id, group_id, result, scanned_at, guest_groups(name, table_number)")
          .eq("id", payload.new.id)
          .single();

        if (data) {
          setLogs((prev) => [data as unknown as LogRow, ...prev].slice(0, 200));
        } else {
          // Fallback: refetch completo si la consulta individual falla
          fetchLogs();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLogs]);

  const filtered = useMemo(() => {
    if (activeFilter === "Todos") return logs;
    if (activeFilter === "Válidos") return logs.filter((l) => l.result === "valid");
    if (activeFilter === "Ya usados") return logs.filter((l) => l.result === "already_used");
    return logs.filter((l) => l.result === "invalid");
  }, [logs, activeFilter]);

  const grouped = useMemo(() => {
    const groups: { label: string; items: LogRow[] }[] = [];
    for (const log of filtered) {
      const label = formatDayLabel(log.scanned_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) {
        last.items.push(log);
      } else {
        groups.push({ label, items: [log] });
      }
    }
    return groups;
  }, [filtered]);

  const counts = useMemo(() => ({
    total: logs.length,
    valid: logs.filter((l) => l.result === "valid").length,
    used: logs.filter((l) => l.result === "already_used").length,
    invalid: logs.filter((l) => l.result === "invalid").length,
  }), [logs]);

  return (
    <div className="min-h-screen bg-surface pb-10">
      <div className="max-w-md mx-auto min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4 border-b border-line-strong/70">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-card border border-line-strong flex items-center justify-center text-muted shadow-card shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-semibold">
                Registros
              </p>
              <h1 className="font-serif text-lg leading-none text-content">Historial de escaneos</h1>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                  activeFilter === filter
                    ? "bg-ink text-white dark:bg-gold dark:text-ink"
                    : "bg-card border border-line-strong text-content-soft hover:bg-field"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </header>

        {/* Summary */}
        {!loading && logs.length > 0 && (
          <section className="px-5 pt-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-card rounded-xl border border-line p-2.5 shadow-card">
                <p className="text-base font-bold text-content leading-none">{counts.total}</p>
                <p className="text-[10px] text-muted font-medium mt-1">Total</p>
              </div>
              <div className="bg-card rounded-xl border border-line p-2.5 shadow-card">
                <p className="text-base font-bold text-emerald-600 leading-none">{counts.valid}</p>
                <p className="text-[10px] text-muted font-medium mt-1">Válidos</p>
              </div>
              <div className="bg-card rounded-xl border border-line p-2.5 shadow-card">
                <p className="text-base font-bold text-amber-500 leading-none">{counts.used}</p>
                <p className="text-[10px] text-muted font-medium mt-1">Ya usados</p>
              </div>
              <div className="bg-card rounded-xl border border-line p-2.5 shadow-card">
                <p className="text-base font-bold text-rose-600 leading-none">{counts.invalid}</p>
                <p className="text-[10px] text-muted font-medium mt-1">Inválidos</p>
              </div>
            </div>
          </section>
        )}

        {/* List */}
        <section className="px-5 pt-4">
          {loading ? (
            <div className="text-center py-10 text-muted-soft text-sm">Cargando historial...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-field flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-sm font-medium text-content-soft">Sin registros</p>
              <p className="text-xs text-muted-soft mt-1">
                Los escaneos aparecerán aquí en tiempo real
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-soft uppercase tracking-wide mb-2 px-1">
                    {group.label}
                  </p>
                  <div className="space-y-2.5">
                    {group.items.map((log) => (
                      <article
                        key={log.id}
                        className="bg-card border border-line rounded-xl p-3.5 shadow-card flex items-center gap-3"
                      >
                        <span
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            log.result === "valid"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                              : log.result === "already_used"
                                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                          }`}
                        >
                          {log.result === "valid" ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          ) : log.result === "already_used" ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 8v4l3 3" />
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-content truncate">
                            {log.guest_groups?.name || "Grupo eliminado"}
                          </p>
                          <p className="text-[11px] text-muted mt-0.5">
                            {log.guest_groups?.table_number
                              ? `Mesa ${log.guest_groups.table_number} · `
                              : ""}
                            {formatTime(log.scanned_at)}
                          </p>
                        </div>
                        {resultBadge(log.result)}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
