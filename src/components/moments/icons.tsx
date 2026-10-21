// Íconos de Momentos (trazos estilo Phosphor, inline como el resto del proyecto)
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function CameraIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

export function CameraPlusIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M13 20H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l2.5-3h5L17 7h3a2 2 0 0 1 2 2v3" />
      <circle cx="11" cy="13" r="3" />
      <path d="M19 16v6M16 19h6" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={2}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function UsersIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0" />
      <path d="M16 4.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4-6.3" />
    </svg>
  );
}

export function SendIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.4 11.1 4.3 2.6a1 1 0 0 0-1.4 1.2L5.6 12l-2.7 8.2a1 1 0 0 0 1.4 1.2l17.1-8.5a1 1 0 0 0 0-1.8ZM7.3 13h5.2a1 1 0 0 0 0-2H7.3L5.6 5.9 18.5 12 5.6 18.1Z" />
    </svg>
  );
}

export function HeartIcon({ className = "", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg className={className} {...base} fill={filled ? "currentColor" : "none"}>
      <path d="M19.5 12.6 12 20l-7.5-7.4A5 5 0 1 1 12 6a5 5 0 1 1 7.5 6.6Z" />
    </svg>
  );
}

export function DownloadIcon({ className = "" }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </svg>
  );
}
