"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navIconInvitados = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 21a8 8 0 0 0-16 0" />
    <circle cx="10" cy="8" r="5" />
    <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
  </svg>
);

const navIconEscanear = (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <rect x="7" y="7" width="10" height="10" rx="1" />
  </svg>
);

const navIconEnviar = (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a3 3 0 0 1 0-6V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v2" />
    <path d="M13 17v2" />
    <path d="M13 11v2" />
  </svg>
);

const allNavItems = [
  { href: "/", label: "Invitados", icon: navIconInvitados },
  { href: "/scanner", label: "Escanear", isCenter: true, icon: navIconEscanear },
  { href: "/pases", label: "Enviar", hideForScanner: true, icon: navIconEnviar },
];

export function BottomNav({ role = "organizer" }: { role?: string }) {
  const pathname = usePathname();

  const visibleNavItems = role === "scanner"
    ? allNavItems.filter((i) => !i.hideForScanner)
    : allNavItems;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-line safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 relative px-8">
        {visibleNavItems.map((item, i) => {
          const isActive = pathname === item.href;

          if (item.isCenter) {
            return (
              <Link key={i} href={item.href} className="absolute left-1/2 -translate-x-1/2 -mt-7 flex flex-col items-center gap-1">
                <span className="w-14 h-14 rounded-full bg-ink dark:bg-gold dark:text-ink text-white shadow-lift flex items-center justify-center">
                  {item.icon}
                </span>
                <span className={cn("text-[10px] font-semibold", isActive ? "text-content" : "text-content/80")}>
                  {item.label}
                </span>
              </Link>
            );
          }

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
