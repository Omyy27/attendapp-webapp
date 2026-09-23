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
  variant?: "sidebar" | "floating";
  table: VenueTable;
  assignedGroups: GuestGroup[];
  allGroups: GuestGroup[];
  onAssignTable: (groupIds: string[], tableNumber: number) => void;
  onUnassignGroup: (groupId: string) => void;
  onClose: () => void;
}

function GroupRow({
  group,
  action,
  onAction,
}: {
  group: GuestGroup;
  action: "assign" | "unassign";
  onAction: () => void;
}) {
  const slots = group.guests.reduce((a, b) => a + (b.slots ?? 1), 0);
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="min-w-0">
        <span className="text-xs font-medium text-content truncate block">{group.name}</span>
        <span className="text-[10px] text-muted-soft">{slots} cupos</span>
      </div>
      <button
        onClick={onAction}
        className={
          action === "unassign"
            ? "text-[10px] text-rose-500 font-semibold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
            : "text-[10px] text-sky font-semibold px-2 py-0.5 rounded hover:bg-sky/10 shrink-0"
        }
      >
        {action === "unassign" ? "Quitar" : "Asignar"}
      </button>
    </div>
  );
}

export function TablePanel({
  variant = "floating",
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
  const isEmpty = assignedGroups.length === 0 && unassigned.length === 0;

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
      <div>
        <h3 className="text-sm font-semibold text-content">Mesa {table.table_number}</h3>
        <p className="text-[11px] text-muted">{totalAssigned} cupos asignados</p>
      </div>
      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full bg-field flex items-center justify-center text-muted hover:text-content transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );

  const body = (
    <>
      {assignedGroups.length > 0 && (
        <div className="px-4 py-2 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Asignados</p>
          {assignedGroups.map((g) => (
            <GroupRow key={g.id} group={g} action="unassign" onAction={() => onUnassignGroup(g.id)} />
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="px-4 py-2 border-t border-line overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Sin asignar</p>
          {unassigned.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              action="assign"
              onAction={() => onAssignTable([g.id], table.table_number)}
            />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="px-4 py-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-field mx-auto mb-2 flex items-center justify-center">
            <svg className="w-5 h-5 text-muted-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 21a8 8 0 0 0-16 0" />
              <circle cx="10" cy="8" r="5" />
              <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
            </svg>
          </div>
          <p className="text-xs text-muted-soft">No hay grupos familiares creados</p>
        </div>
      )}
    </>
  );

  if (variant === "sidebar") {
    return (
      <aside className="hidden md:flex flex-col w-72 lg:w-80 border-l border-line bg-card shrink-0 overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto">{body}</div>
      </aside>
    );
  }

  // Floating bottom sheet (mobile)
  return (
    <div className="fixed bottom-20 inset-x-0 z-40 mx-auto max-w-md md:hidden">
      <div className="mx-3 bg-card rounded-2xl border border-line shadow-[0_-4px_24px_-4px_rgba(10,37,64,.15)] overflow-hidden max-h-[50vh] flex flex-col">
        {header}
        <div className="overflow-y-auto flex-1">{body}</div>
      </div>
    </div>
  );
}
