"use client";

import { Group, Circle, Rect, Text } from "react-konva";

interface TableShapeProps {
  table: {
    id: string;
    table_number: number;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    shape: "circle" | "rectangle";
    color: string;
  };
  isSelected: boolean;
  assignedGroups: { name: string; guests: { first_name: string; slots: number }[] }[];
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}

export function TableShape({ table, isSelected, assignedGroups, onSelect, onDragEnd }: TableShapeProps) {
  const totalSlots = assignedGroups.reduce(
    (sum, g) => sum + g.guests.reduce((a, b) => a + (b.slots ?? 1), 0),
    0
  );
  const radius = table.width / 2;

  return (
    <Group
      x={table.x + radius}
      y={table.y + radius}
      draggable
      rotation={table.rotation}
      onClick={onSelect}
      onTouchStart={onSelect}
      onDragEnd={(e) => {
        onDragEnd(e.target.x() - radius, e.target.y() - radius);
      }}
    >
      {/* Shadow */}
      {isSelected && (
        <>
          {table.shape === "circle" ? (
            <Circle
              radius={radius + 4}
              fill="transparent"
              stroke="#c8a054"
              strokeWidth={3}
              dash={[6, 3]}
            />
          ) : (
            <Rect
              x={-radius - 4}
              y={-radius - 4}
              width={table.width + 8}
              height={table.height + 8}
              cornerRadius={12}
              fill="transparent"
              stroke="#c8a054"
              strokeWidth={3}
              dash={[6, 3]}
            />
          )}
        </>
      )}

      {/* Table shape */}
      {table.shape === "circle" ? (
        <Circle
          radius={radius}
          fill={table.color || "#c8a054"}
          stroke={isSelected ? "#0a2540" : "#b8943f"}
          strokeWidth={2}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={8}
          shadowOffsetY={2}
        />
      ) : (
        <Rect
          x={-radius}
          y={-radius}
          width={table.width}
          height={table.height}
          cornerRadius={10}
          fill={table.color || "#c8a054"}
          stroke={isSelected ? "#0a2540" : "#b8943f"}
          strokeWidth={2}
          shadowColor="rgba(0,0,0,0.15)"
          shadowBlur={8}
          shadowOffsetY={2}
        />
      )}

      {/* Table number */}
      <Text
        text={`M${table.table_number}`}
        fontSize={16}
        fontFamily="Plus Jakarta Sans, sans-serif"
        fontStyle="bold"
        fill="#fff"
        align="center"
        verticalAlign="middle"
        x={-radius}
        y={-10}
        width={table.width}
        height={20}
      />

      {/* Assigned count */}
      <Text
        text={totalSlots > 0 ? `${totalSlots} cupos` : "Sin asignar"}
        fontSize={10}
        fontFamily="Plus Jakarta Sans, sans-serif"
        fill="rgba(255,255,255,0.8)"
        align="center"
        verticalAlign="middle"
        x={-radius}
        y={8}
        width={table.width}
        height={14}
      />

      {/* Occupancy bar */}
      {totalSlots > 0 && (
        <>
          <Rect
            x={-radius * 0.6}
            y={22}
            width={radius * 1.2}
            height={3}
            cornerRadius={2}
            fill="rgba(255,255,255,0.25)"
          />
          <Rect
            x={-radius * 0.6}
            y={22}
            width={Math.max(radius * 0.12, Math.min(radius * 1.2, (totalSlots / 12) * radius * 1.2))}
            height={3}
            cornerRadius={2}
            fill={totalSlots >= 12 ? "#38bdf8" : "#fff"}
          />
        </>
      )}
    </Group>
  );
}
