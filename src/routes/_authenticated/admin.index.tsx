import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, Boxes, Activity, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

type Stats = { users: number; items: number; activeUsers: number; totalQty: number };
type RecentItem = { id: string; item_name: string; part_number: string; quantity: number; created_at: string; username?: string };
type RecentLog = { id: string; username: string; action: string; item_name: string | null; created_at: string };

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Admin Dashboard — Item Storage Unit";
    const load = async () => {
      const [usersRes, itemsRes, qtyRes, activeRes, recentItemsRes, recentLogsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("items").select("quantity"),
        supabase.from("activity_logs").select("user_id").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("items").select("id, item_name, part_number, quantity, created_at, user_id").order("created_at", { ascending: false }).limit(5),
        supabase.from("activity_logs").select("id, username, action, item_name, created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const totalQty = (qtyRes.data ?? []).reduce((s: number, r: { quantity: number }) => s + (r.quantity || 0), 0);
      const active = new Set((activeRes.data ?? []).map((r: { user_id: string }) => r.user_id)).size;

      const ids = Array.from(new Set((recentItemsRes.data ?? []).map((i: { user_id: string }) => i.user_id)));
      const profsRes = ids.length
        ? await supabase.from("profiles").select("id, username").in("id", ids)
        : { data: [] as { id: string; username: string }[] };
      const nameById = new Map((profsRes.data ?? []).map((p) => [p.id, p.username]));

      setStats({
        users: usersRes.count ?? 0,
        items: itemsRes.count ?? 0,
        activeUsers: active,
        totalQty,
      });
      setRecentItems(((recentItemsRes.data ?? []) as Array<RecentItem & { user_id: string }>).map((i) => ({
        ...i,
        username: nameById.get(i.user_id),
      })));
      setRecentLogs((recentLogsRes.data ?? []) as RecentLog[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">System overview and recent activity.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value={stats?.users ?? "—"} loading={loading} />
        <StatCard icon={Boxes} label="Total Items" value={stats?.items ?? "—"} loading={loading} />
        <StatCard icon={Activity} label="Active (7d)" value={stats?.activeUsers ?? "—"} loading={loading} />
        <StatCard icon={TrendingUp} label="Total Quantity" value={stats?.totalQty ?? "—"} loading={loading} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Recently Added Items</h2>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : recentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            <ul className="divide-y">
              {recentItems.map((i) => (
                <li key={i.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{i.item_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{i.part_number} · by @{i.username ?? "unknown"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(i.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold mb-3">Recent Activity</h2>
          {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {recentLogs.map((l) => (
                <li key={l.id} className="py-2 flex items-center justify-between gap-3">
                  <p className="text-sm truncate min-w-0">
                    <span className="font-medium">@{l.username}</span>{" "}
                    <span className={actionColor(l.action)}>{l.action}d</span>{" "}
                    <span className="text-muted-foreground">{l.item_name ?? ""}</span>
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, loading }: { icon: typeof Users; label: string; value: number | string; loading: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-2xl font-bold mt-2">{loading ? "…" : value}</p>
    </Card>
  );
}

function actionColor(a: string) {
  if (a === "create") return "text-green-600";
  if (a === "update") return "text-blue-600";
  if (a === "delete") return "text-red-600";
  return "text-muted-foreground";
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}