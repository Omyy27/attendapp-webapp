"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { visibleNavItems } from "./nav-items";

interface DesktopSidebarProps {
  role: string;
}

export function DesktopSidebar({ role }: DesktopSidebarProps) {
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 z-40 flex-col bg-card border-r border-line">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-line">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-ink dark:bg-gold dark:text-ink text-gold flex items-center justify-center">
            <svg className="w-4.5 h-4.5" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.5c-1.73 0-3.37.73-4.55 2.01L12 9.06l4.55-4.55A6.47 6.47 0 0 0 12 2.5zm0 19c1.73 0 3.37-.73 4.55-2.01L12 14.94l-4.55 4.55A6.47 6.47 0 0 0 12 21.5z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-serif text-base leading-none text-content">Attendapp</p>
            <p className="text-[10px] text-muted-soft mt-0.5">Gestión de invitados</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                isActive
                  ? "bg-ink dark:bg-gold dark:text-ink text-white font-semibold shadow-card"
                  : "text-content-soft font-medium hover:bg-field hover:text-content"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
              {isActive && (
                <span className={cn("ml-auto w-1.5 h-1.5 rounded-full", "bg-gold dark:bg-ink")} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-line">
        <Link
          href="/perfil"
          className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-field transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-ink dark:bg-gold dark:text-ink text-gold flex items-center justify-center text-xs font-bold shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-content truncate">Mi perfil</p>
            <p className="text-[10px] text-muted-soft">Ajustes y cuenta</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
