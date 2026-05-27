import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Skip auth check during SSR — no session storage available on the server,
    // which would falsely redirect authenticated users to /login.
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
      setUsername(p?.username ?? null);
    });
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 to-white">
      <AppHeader username={username} />
      <main className="container mx-auto px-4 py-8"><Outlet /></main>
    </div>
  );
}