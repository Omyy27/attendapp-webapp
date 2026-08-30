"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info" | "danger";
  className?: string;
}

const variants = {
  default: "bg-slate-50 text-slate-500",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-sky/10 text-sky",
  danger: "bg-rose-50 text-rose-600",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center gap-1",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
