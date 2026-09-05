"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "dark";
  className?: string;
}

export function Card({ children, variant = "default", className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-card",
        variant === "default"
          ? "bg-card border-line"
          : "bg-ink border-ink shadow-lift",
        className
      )}
    >
      {children}
    </div>
  );
}
