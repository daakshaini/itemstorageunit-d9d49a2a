import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, ShieldAlert, LogIn, UserCog } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/security")({
  component: AdminSecurity,
});

type AuthLog = { id: string; username: string | null; event: string; created_at: string; metadata: Record<string, unknown> | null };
type AdminAction = { id: string; admin_username: string; action: string; target_type: string; target_label: string | null; created_at: string };

function AdminSecurity() {
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Security — Admin";
    (async () => {
      const [a, b] = await Promise.all([
        supabase.from("auth_logs").select("id, username, event, created_at, metadata").order("created_at", { ascending: false }).limit(500),
        supabase.from("admin_actions").select("id, admin_username, action, target_type, target_label, created_at").order("created_at", { ascending: false }).limit(500),
      ]);
      setAuthLogs((a.data ?? []) as AuthLog[]);
      setAdminActions((b.data ?? []) as AdminAction[]);
      setLoading(false);
    })();
  }, []);

  // Suspicious: usernames with >=3 failed logins in last 24h
  const suspicious = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const counts = new Map<string, { fails: number; last: string }>();
    for (const l of authLogs) {
      if (new Date(l.created_at).getTime() < cutoff) continue;
      if (l.event !== "login_failed" && l.event !== "blocked_attempt" && l.event !== "rate_limited") continue;
      const key = l.username ?? "(unknown)";
      const c = counts.get(key) ?? { fails: 0, last: l.created_at };
      c.fails += 1;
      if (l.created_at > c.last) c.last = l.created_at;
      counts.set(key, c);
    }
    return Array.from(counts.entries())
      .filter(([, v]) => v.fails >= 3)
      .map(([username, v]) => ({ username, ...v }))
      .sort((a, b) => b.fails - a.fails);
  }, [authLogs]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Security & Audit</h1>
        <p className="text-muted-foreground text-sm">Auth events, admin actions, and suspicious activity.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={LogIn} label="Auth Events" value={loading ? "…" : authLogs.length} />
        <StatCard icon={UserCog} label="Admin Actions" value={loading ? "…" : adminActions.length} />
        <StatCard icon={AlertTriangle} label="Suspicious Users (24h)" value={loading ? "…" : suspicious.length} danger={suspicious.length > 0} />
      </div>

      {suspicious.length > 0 && (
        <Card className="p-5 mb-6 border-orange-300 bg-orange-50/50">
          <h2 className="font-semibold flex items-center gap-2 mb-3 text-orange-800">
            <ShieldAlert className="w-4 h-4" /> Suspicious Activity
          </h2>
          <ul className="divide-y">
            {suspicious.map((s) => (
              <li key={s.username} className="py-2 flex items-center justify-between text-sm">
                <span className="font-medium">@{s.username}</span>
                <span className="text-muted-foreground">
                  <Badge variant="destructive" className="mr-2">{s.fails} failed</Badge>
                  last: {new Date(s.last).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Tabs defaultValue="auth">
        <TabsList>
          <TabsTrigger value="auth">Auth Logs</TabsTrigger>
          <TabsTrigger value="admin">Admin Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="auth">
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-muted-foreground">Loading...</div>
            ) : authLogs.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">No auth events yet.</div>
            ) : (
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {authLogs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell><Badge variant={eventVariant(l.event)} className="capitalize">{l.event.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="font-medium">@{l.username ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {l.metadata ? Object.entries(l.metadata).map(([k, v]) => `${k}: ${String(v)}`).join(", ") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-muted-foreground">Loading...</div>
            ) : adminActions.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">No admin actions yet.</div>
            ) : (
              <Table>
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminActions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">@{a.admin_username}</TableCell>
                      <TableCell><Badge variant={a.action.startsWith("delete") ? "destructive" : "secondary"} className="capitalize">{a.action.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{a.target_type}: <span className="font-medium">{a.target_label ?? "—"}</span></TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function eventVariant(e: string): "default" | "secondary" | "destructive" | "outline" {
  if (e === "login_success" || e === "signup") return "secondary";
  if (e === "logout") return "outline";
  return "destructive";
}

function StatCard({ icon: Icon, label, value, danger }: { icon: typeof LogIn; label: string; value: number | string; danger?: boolean }) {
  return (
    <Card className={`p-5 ${danger ? "border-orange-300 bg-orange-50/50" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className={`w-4 h-4 ${danger ? "text-orange-600" : "text-primary"}`} />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </Card>
  );
}