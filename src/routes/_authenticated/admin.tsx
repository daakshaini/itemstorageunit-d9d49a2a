import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Activity, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) throw redirect({ to: "/login" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/inventory" });
  },
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/activity", label: "Activity Logs", icon: Activity },
] as const;

function AdminLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6">
      <aside className="md:sticky md:top-20 md:self-start">
        <div className="rounded-lg border bg-white p-3 space-y-1">
          <div className="px-2 py-2 mb-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Admin Console</p>
          </div>
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
          <div className="pt-2 mt-2 border-t">
            <Link to="/inventory" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-muted-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to app
            </Link>
          </div>
        </div>
      </aside>
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}