"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info" | "danger";
  className?: string;
}

const variants = {
  default: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  info: "bg-sky/10 text-sky dark:bg-sky/15",
  danger: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
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
