"use client";

interface VenueTable {
  table_number: number;
}

interface GuestGroup {
  id: string;
  name: string;
  table_number: number | null;
  guests: { first_name: string; last_name: string; slots: number }[];
}

interface TablePanelProps {
  table: VenueTable;
  assignedGroups: GuestGroup[];
  allGroups: GuestGroup[];
  onAssignTable: (groupIds: string[], tableNumber: number) => void;
  onUnassignGroup: (groupId: string) => void;
  onClose: () => void;
}

export function TablePanel({
  table,
  assignedGroups,
  allGroups,
  onAssignTable,
  onUnassignGroup,
  onClose,
}: TablePanelProps) {
  const unassigned = allGroups.filter((g) => g.table_number === null);
  const totalAssigned = assignedGroups.reduce(
    (sum, g) => sum + g.guests.reduce((a, b) => a + (b.slots ?? 1), 0),
    0
  );

  function handleAssign(groupId: string) {
    onAssignTable([groupId], table.table_number);
  }

  return (
    <div className="fixed bottom-20 inset-x-0 z-40 mx-auto max-w-md">
      <div className="mx-3 bg-card rounded-2xl border border-line shadow-[0_-4px_24px_-4px_rgba(10,37,64,.15)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <div>
            <h3 className="text-sm font-semibold text-content">Mesa {table.table_number}</h3>
            <p className="text-[11px] text-muted">{totalAssigned} cupos asignados</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-field flex items-center justify-center text-muted">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Assigned groups */}
        {assignedGroups.length > 0 && (
          <div className="px-4 py-2 max-h-40 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Asignados</p>
            {assignedGroups.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-xs font-medium text-content">{g.name}</span>
                  <span className="text-[10px] text-muted-soft ml-1.5">
                    {g.guests.reduce((a, b) => a + (b.slots ?? 1), 0)} cupos
                  </span>
                </div>
                <button
                  onClick={() => onUnassignGroup(g.id)}
                  className="text-[10px] text-rose-500 font-semibold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Unassigned groups */}
        {unassigned.length > 0 && (
          <div className="px-4 py-2 border-t border-line max-h-40 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">Sin asignar</p>
            {unassigned.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-xs font-medium text-content">{g.name}</span>
                  <span className="text-[10px] text-muted-soft ml-1.5">
                    {g.guests.reduce((a, b) => a + (b.slots ?? 1), 0)} cupos
                  </span>
                </div>
                <button
                  onClick={() => handleAssign(g.id)}
                  className="text-[10px] text-sky font-semibold px-2 py-0.5 rounded hover:bg-sky/10"
                >
                  Asignar
                </button>
              </div>
            ))}
          </div>
        )}

        {assignedGroups.length === 0 && unassigned.length === 0 && (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-muted-soft">No hay grupos familiares creados</p>
          </div>
        )}
      </div>
    </div>
  );
}
