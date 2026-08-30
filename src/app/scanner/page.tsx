"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/ui/bottom-nav";

type ScanResult = {
  type: "valid" | "rejected" | null;
  guestName?: string;
  tableNumber?: number;
  groupName?: string;
  guestCount?: number;
  time?: string;
  message?: string;
};

export default function ScannerPage() {
  const [scanResult, setScanResult] = useState<ScanResult>({ type: null });
  const [isScanning, setIsScanning] = useState(true);
  const [stats, setStats] = useState({ valid: 0, rejected: 0, remaining: 0 });
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: organizer } = await supabase
      .from("organizers")
      .select("wedding_id")
      .eq("user_id", user.id)
      .single();

    if (!organizer?.wedding_id) return;

    const { data: groups } = await supabase
      .from("guest_groups")
      .select("id")
      .eq("wedding_id", organizer.wedding_id);

    const groupIds = (groups || []).map((g) => g.id);
    if (groupIds.length === 0) return;

    const { count: totalGuests } = await supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .in("group_id", groupIds);

    const { count: checkedIn } = await supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .in("group_id", groupIds)
      .eq("status", "checked_in");

    const { data: scanLogs } = await supabase
      .from("scan_logs")
      .select("result")
      .in("group_id", groupIds);

    const rejected = (scanLogs || []).filter((l) => l.result === "already_used").length;

    setStats({
      valid: checkedIn || 0,
      rejected,
      remaining: (totalGuests || 0) - (checkedIn || 0),
    });
  }, [supabase]);

  const handleScan = async (uuid: string) => {
    setIsScanning(false);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid }),
      });

      const data = await res.json();

      if (data.result === "valid") {
        setScanResult({
          type: "valid",
          guestName: data.group.name,
          tableNumber: data.group.table_number,
          groupName: data.group.name,
          guestCount: data.group.guest_count,
        });
      } else {
        setScanResult({
          type: "rejected",
          message: data.message,
          time: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
        });
      }

      fetchStats();

      setTimeout(() => {
        setScanResult({ type: null });
        setIsScanning(true);
      }, 3000);
    } catch {
      setScanResult({ type: "rejected", message: "Error de conexión" });
      setTimeout(() => {
        setScanResult({ type: null });
        setIsScanning(true);
      }, 3000);
    }
  };

  const simulateScan = (type: "valid" | "rejected") => {
    if (type === "valid") {
      handleScan("test-valid-uuid");
    } else {
      setIsScanning(false);
      setScanResult({
        type: "rejected",
        message: "QR ya utilizado",
        time: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
      });
      setTimeout(() => {
        setScanResult({ type: null });
        setIsScanning(true);
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="max-w-md mx-auto min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-ink text-gold flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                Portero
              </p>
              <h1 className="font-serif text-base leading-none text-ink">Ojo de Halcon</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats.valid}/{stats.valid + stats.remaining}
            </span>
          </div>
        </header>

        {/* Camera View */}
        <section className="relative h-[440px] bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 20%, rgba(56,189,248,.25), transparent 45%), radial-gradient(circle at 70% 80%, rgba(200,160,84,.15), transparent 40%)",
            }}
          />

          {/* Scan frame */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              <span className="absolute top-0 left-0 w-10 h-10 border-t-[3px] border-l-[3px] border-sky rounded-tl-2xl" />
              <span className="absolute top-0 right-0 w-10 h-10 border-t-[3px] border-r-[3px] border-sky rounded-tr-2xl" />
              <span className="absolute bottom-0 left-0 w-10 h-10 border-b-[3px] border-l-[3px] border-sky rounded-bl-2xl" />
              <span className="absolute bottom-0 right-0 w-10 h-10 border-b-[3px] border-r-[3px] border-sky rounded-br-2xl" />
              {isScanning && (
                <div className="absolute left-2 right-2 h-0.5 bg-sky/80 shadow-[0_0_12px_2px_rgba(56,189,248,.8)] animate-scan" />
              )}
            </div>
          </div>

          <p className="absolute bottom-16 inset-x-0 text-center text-slate-300 text-xs font-medium tracking-wide">
            Apunta la camara al codigo QR del pase
          </p>

          {/* Demo buttons */}
          <div className="absolute bottom-6 inset-x-0 flex justify-center gap-3">
            <button
              onClick={() => simulateScan("valid")}
              className="bg-emerald-500/80 text-white text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-sm"
            >
              Simular valido
            </button>
            <button
              onClick={() => simulateScan("rejected")}
              className="bg-rose-500/80 text-white text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-sm"
            >
              Simular rechazado
            </button>
          </div>
        </section>

        {/* Verdict Cards */}
        <section className="px-5 -mt-10 relative z-20 space-y-3">
          {scanResult.type === "valid" && (
            <div className="bg-emerald-500 rounded-2xl shadow-lift p-4 flex items-center gap-3.5 border border-emerald-400/40 animate-fade-in">
              <span className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base leading-tight">A celebrar!</p>
                <p className="text-white/85 text-xs font-medium truncate">
                  {scanResult.groupName} · Mesa {scanResult.tableNumber} · {scanResult.guestCount} personas
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-1 rounded-full whitespace-nowrap">
                VALIDO
              </span>
            </div>
          )}

          {scanResult.type === "rejected" && (
            <div className="bg-rose-600 rounded-2xl shadow-lift p-4 flex items-center gap-3.5 border border-rose-400/40 animate-fade-in">
              <span className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base leading-tight">Intruso detectado</p>
                <p className="text-white/85 text-xs font-medium truncate">
                  {scanResult.message} {scanResult.time && `\u00b7 ${scanResult.time}`}
                </p>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-1 rounded-full whitespace-nowrap">
                RECHAZADO
              </span>
            </div>
          )}
        </section>

        {/* Stats Strip */}
        <section className="px-5 pt-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-card">
              <p className="text-lg font-bold text-emerald-600 leading-none">{stats.valid}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Validos</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-card">
              <p className="text-lg font-bold text-rose-600 leading-none">{stats.rejected}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Rechazados</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-3 text-center shadow-card">
              <p className="text-lg font-bold text-ink leading-none">{stats.remaining}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Restantes</p>
            </div>
          </div>
        </section>

        {/* Backup Search */}
        <section className="px-5 pt-5">
          <Link
            href="/scanner/search"
            className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-card hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gold-faint text-gold-deep flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Buscador de respaldo</p>
                <p className="text-[11px] text-slate-500">Plan B: busca por nombre y apellido</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </section>
      </div>

      <BottomNav />

      <style jsx>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(200px); }
        }
        .animate-scan {
          animation: scan 2.4s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
