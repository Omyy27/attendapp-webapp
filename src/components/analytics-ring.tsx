"use client";

interface AnalyticsRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
}

export function AnalyticsRing({
  percentage,
  size = 56,
  strokeWidth = 4,
  color,
  bgColor,
}: AnalyticsRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor ?? "var(--line-strong)"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? "#38bdf8"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dashoffset 0.9s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-bold text-content text-[13px]">
        {percentage}%
      </span>
    </div>
  );
}
