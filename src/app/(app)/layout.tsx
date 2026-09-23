"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/lib/use-supabase";
import { BottomNav } from "@/components/ui/bottom-nav";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState("organizer");
  const supabase = useSupabase();

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: organizer } = await supabase
        .from("organizers")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (!cancelled && organizer) setRole(organizer.role || "organizer");
    }
    loadRole();
    return () => { cancelled = true; };
  }, [supabase]);

  return (
    <>
      <DesktopSidebar role={role} />
      <div className="md:pl-60">
        {children}
      </div>
      <div id="tour-nav">
        <BottomNav role={role} />
      </div>
    </>
  );
}
