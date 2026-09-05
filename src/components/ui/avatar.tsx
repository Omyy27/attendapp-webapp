"use client";

import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  variant?: "gold" | "slate" | "emerald";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variants = {
  gold: "bg-gold-faint text-gold-deep dark:bg-gold/15 dark:text-gold",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
};

const sizes = {
  sm: "w-9 h-9 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
};

export function Avatar({
  initials,
  variant = "gold",
  size = "md",
  className,
}: AvatarProps) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-serif font-semibold shrink-0",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
