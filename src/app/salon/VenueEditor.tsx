"use client";

import "konva/lib/shapes/Circle";
import "konva/lib/shapes/Rect";
import "konva/lib/shapes/Text";
import { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Layer } from "react-konva";
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

export default function VenueEditor() {
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weddingId, setWeddingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 390, height: 600 });
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
        x: stageSize.width / 2 - 60,
        y: stageSize.height / 2 - 60,
        shape: "circle",
      })
      .select()
      .single();

    if (!error && data) {
      setTables((prev) => [...prev, data as VenueTable]);
      setSelectedId(data.id);
    }
  }, [weddingId, tables, stageSize, supabase]);

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
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 border-b border-line-strong/70">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-lg text-content">Salón</h1>
            <p className="text-[11px] text-muted font-medium">{tables.length} mesas · {groups.reduce((s, g) => s + g.guests.reduce((a, b) => a + (b.slots ?? 1), 0), 0)} cupos asignados</p>
          </div>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="bg-ink dark:bg-gold dark:text-ink text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-card hover:bg-ink-light transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onTouchStart={(e) => {
            if (e.target === e.target.getStage()) setSelectedId(null);
          }}
          onClick={(e) => {
            if (e.target === e.target.getStage()) setSelectedId(null);
          }}
        >
          <Layer>
            {/* Grid dots */}
            {Array.from({ length: Math.ceil(stageSize.width / 30) }).map((_, i) =>
              Array.from({ length: Math.ceil(stageSize.height / 30) }).map((_, j) => (
                <circle
                  key={`${i}-${j}`}
                  x={i * 30}
                  y={j * 30}
                  radius={1}
                  fill="#d1d5db"
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
      </div>

      {/* Toolbar */}
      <EditorToolbar
        onAdd={handleAddTable}
        onDelete={selectedId ? handleDeleteTable : undefined}
        selectedNumber={selectedTable?.table_number}
      />

      {/* Panel */}
      {selectedTable && (
        <TablePanel
          table={selectedTable}
          assignedGroups={getTableGroups(selectedTable.table_number)}
          allGroups={groups}
          onAssignTable={handleAssignTable}
          onUnassignGroup={handleUnassignGroup}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
