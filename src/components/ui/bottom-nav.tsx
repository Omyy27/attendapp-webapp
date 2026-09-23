"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { visibleNavItems } from "./nav-items";

export function BottomNav({ role = "organizer" }: { role?: string }) {
  const pathname = usePathname();

  const items = visibleNavItems(role);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-line safe-bottom md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 relative px-8">
        {items.map((item, i) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={i}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 transition-colors",
                isActive
                  ? "text-content"
                  : "text-muted-soft hover:text-content"
              )}
            >
              {item.icon}
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-gold" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
