"use client";

import "konva/lib/shapes/Circle";
import "konva/lib/shapes/Rect";
import "konva/lib/shapes/Text";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Stage, Layer, Circle } from "react-konva";
import { useSupabase } from "@/lib/use-supabase";
import { TableShape } from "./TableShape";
import { TablePanel } from "./TablePanel";
import { EditorToolbar } from "./EditorToolbar";

interface VenueTable {
  id: string;
  wedding_id: string;
  table_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: "circle" | "rectangle";
  color: string;
}

interface GuestGroup {
  id: string;
  name: string;
  table_number: number | null;
  guests: { first_name: string; last_name: string; slots: number }[];
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

export default function VenueEditor() {
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weddingId, setWeddingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 390, height: 600 });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = useSupabase();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: organizer } = await supabase
        .from("organizers")
        .select("wedding_id")
        .eq("user_id", user.id)
        .single();

      if (!organizer?.wedding_id) return;
      setWeddingId(organizer.wedding_id);

      const [tablesResult, groupsResult] = await Promise.all([
        supabase.from("venue_tables").select("*").eq("wedding_id", organizer.wedding_id),
        supabase
          .from("guest_groups")
          .select("id, name, table_number, guests(first_name, last_name, slots)")
          .eq("wedding_id", organizer.wedding_id),
      ]);

      setTables((tablesResult.data as VenueTable[]) || []);
      setGroups((groupsResult.data as GuestGroup[]) || []);
      setLoading(false);
    }
    init();
  }, [supabase]);

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const getTableGroups = useCallback(
    (tableNumber: number) => groups.filter((g) => g.table_number === tableNumber),
    [groups]
  );

  const totalAssignedSlots = useMemo(
    () => groups.reduce((s, g) => s + g.guests.reduce((a, b) => a + (b.slots ?? 1), 0), 0),
    [groups]
  );

  const unassignedGroups = useMemo(
    () => groups.filter((g) => g.table_number === null),
    [groups]
  );

  const handleDragEnd = useCallback(
    async (tableId: string, x: number, y: number) => {
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, x, y } : t)));
      await supabase.from("venue_tables").update({ x, y }).eq("id", tableId);
    },
    [supabase]
  );

  const handleAddTable = useCallback(async () => {
    if (!weddingId) return;
    const maxNum = tables.reduce((max, t) => Math.max(max, t.table_number), 0);
    const newNum = maxNum + 1;

    const { data, error } = await supabase
      .from("venue_tables")
      .insert({
        wedding_id: weddingId,
        table_number: newNum,
        x: stageSize.width / 2 / zoom - 60,
        y: stageSize.height / 2 / zoom - 60,
        shape: "circle",
      })
      .select()
      .single();

    if (!error && data) {
      setTables((prev) => [...prev, data as VenueTable]);
      setSelectedId(data.id);
    }
  }, [weddingId, tables, stageSize, zoom, supabase]);

  const handleDeleteTable = useCallback(async () => {
    if (!selectedId) return;
    await supabase.from("venue_tables").delete().eq("id", selectedId);
    setTables((prev) => prev.filter((t) => t.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, supabase]);

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    const updates = tables.map((t) =>
      supabase
        .from("venue_tables")
        .update({ x: t.x, y: t.y, width: t.width, height: t.height, rotation: t.rotation })
        .eq("id", t.id)
    );
    await Promise.all(updates);
    setSaving(false);
  }, [tables, supabase]);

  const handleAssignTable = useCallback(
    async (groupIds: string[], tableNumber: number) => {
      const updates = groupIds.map((gid) =>
        supabase.from("guest_groups").update({ table_number: tableNumber }).eq("id", gid)
      );
      await Promise.all(updates);
      setGroups((prev) =>
        prev.map((g) => (groupIds.includes(g.id) ? { ...g, table_number: tableNumber } : g))
      );
    },
    [supabase]
  );

  const handleUnassignGroup = useCallback(
    async (groupId: string) => {
      await supabase.from("guest_groups").update({ table_number: null }).eq("id", groupId);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, table_number: null } : g)));
    },
    [supabase]
  );

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP)), []);
  const zoomReset = useCallback(() => setZoom(1), []);

  const selectedTable = tables.find((t) => t.id === selectedId) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-muted-soft text-sm">Cargando salón...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-4 md:px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 border-b border-line-strong/70">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-card border border-line flex items-center justify-center text-content-soft hover:text-content hover:border-line-strong transition-colors shrink-0"
              title="Volver"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-lg text-content leading-tight">Salón</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  {tables.length} {tables.length === 1 ? "mesa" : "mesas"}
                </span>
                <span className="text-line-strong">·</span>
                <span className="text-[11px] font-medium text-muted">
                  {totalAssignedSlots} cupos
                </span>
                {unassignedGroups.length > 0 && (
                  <>
                    <span className="text-line-strong">·</span>
                    <span className="text-[11px] font-medium text-rose-500">
                      {unassignedGroups.length} sin asignar
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-[11px] font-medium text-muted-soft">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-ink dark:bg-gold dark:text-ink text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-card hover:bg-ink-light transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </header>

      {/* Editor body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 pb-16 md:pb-0">
        {/* Toolbar: sidebar izq desktop / flotante mobile */}
        <div className="hidden md:flex flex-col items-center w-14 border-r border-line bg-card/50 py-4 gap-2 shrink-0">
          <EditorToolbar
            variant="sidebar"
            onAdd={handleAddTable}
            onDelete={selectedId ? handleDeleteTable : undefined}
            selectedNumber={selectedTable?.table_number}
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={zoomReset}
          />
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden min-h-[400px]">
          {/* Salon boundary */}
          <div className="absolute inset-4 md:inset-6 border border-dashed border-line-strong rounded-xl pointer-events-none opacity-60" />
          <div className="absolute top-2 left-3 md:top-3 md:left-7 text-[10px] font-medium text-muted-soft uppercase tracking-wider pointer-events-none">
            Área del salón
          </div>

          <Stage
            width={stageSize.width}
            height={stageSize.height}
            scaleX={zoom}
            scaleY={zoom}
            draggable={zoom > 1}
            onTouchStart={(e) => {
              if (e.target === e.target.getStage()) setSelectedId(null);
            }}
            onClick={(e) => {
              if (e.target === e.target.getStage()) setSelectedId(null);
            }}
          >
            <Layer>
              {/* Grid dots */}
              {Array.from({ length: Math.ceil(stageSize.width / zoom / 30) + 1 }).map((_, i) =>
                Array.from({ length: Math.ceil(stageSize.height / zoom / 30) + 1 }).map((_, j) => (
                  <Circle
                    key={`${i}-${j}`}
                    x={i * 30}
                    y={j * 30}
                    radius={1}
                    fill="#cbd5e1"
                  />
                ))
              )}
              {tables.map((table) => (
                <TableShape
                  key={table.id}
                  table={table}
                  isSelected={table.id === selectedId}
                  assignedGroups={getTableGroups(table.table_number)}
                  onSelect={() => setSelectedId(table.id)}
                  onDragEnd={(x, y) => handleDragEnd(table.id, x, y)}
                />
              ))}
            </Layer>
          </Stage>

          {/* Empty state */}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-card/90 backdrop-blur-sm border border-line rounded-2xl px-8 py-6 text-center shadow-card pointer-events-auto max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-gold-faint dark:bg-gold/10 mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gold-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-content mb-1">Salón vacío</p>
                <p className="text-xs text-muted mb-4">Agrega mesas para comenzar a diseñar la distribución</p>
                <button
                  onClick={handleAddTable}
                  className="bg-ink dark:bg-gold dark:text-ink text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-card hover:bg-ink-light transition-colors pointer-events-auto"
                >
                  Agregar primera mesa
                </button>
              </div>
            </div>
          )}

          {/* Zoom indicator (solo cuando no es 100%) */}
          {zoom !== 1 && (
            <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm border border-line rounded-lg px-2.5 py-1 text-[11px] font-semibold text-content-soft shadow-card">
              {Math.round(zoom * 100)}%
            </div>
          )}
        </div>

        {/* Panel: sidebar der desktop / bottom sheet mobile */}
        {selectedTable && (
          <TablePanel
            variant="sidebar"
            table={selectedTable}
            assignedGroups={getTableGroups(selectedTable.table_number)}
            allGroups={groups}
            onAssignTable={handleAssignTable}
            onUnassignGroup={handleUnassignGroup}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Toolbar mobile flotante */}
      <div className="md:hidden">
        <EditorToolbar
          variant="floating"
          onAdd={handleAddTable}
          onDelete={selectedId ? handleDeleteTable : undefined}
          selectedNumber={selectedTable?.table_number}
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onZoomReset={zoomReset}
        />
      </div>
    </div>
  );
}
