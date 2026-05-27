import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  component: AdminActivity,
});

type Log = {
  id: string;
  username: string;
  action: string;
  item_name: string | null;
  created_at: string;
  details: { quantity?: number; net_quantity?: number; part_number?: string } | null;
};

function AdminActivity() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    document.title = "Activity Logs — Admin";
    (async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("id, username, action, item_name, created_at, details")
        .order("created_at", { ascending: false })
        .limit(500);
      setLogs((data ?? []) as Log[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        if (filter !== "all" && l.action !== filter) return false;
        if (!q) return true;
        const ql = q.toLowerCase();
        return l.username.toLowerCase().includes(ql) || (l.item_name ?? "").toLowerCase().includes(ql);
      }),
    [logs, q, filter]
  );

  const actionLabel = (a: string) => (a === "create" ? "Added" : a === "delete" ? "Removed" : a);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground text-sm">Every item action across all users.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user or item..." className="pl-9" />
        </div>
        <div className="flex gap-1">
          {[
            { v: "all", label: "All" },
            { v: "create", label: "Added" },
            { v: "delete", label: "Removed" },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-md text-sm border ${filter === f.v ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No activity yet.</div>
        ) : (
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Net Qty</TableHead>
                <TableHead>Date &amp; Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">@{l.username}</TableCell>
                  <TableCell>
                    <Badge variant={l.action === "delete" ? "destructive" : "secondary"}>
                      {actionLabel(l.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>{l.item_name ?? "—"}</TableCell>
                  <TableCell className="text-right">{l.details?.quantity ?? "—"}</TableCell>
                  <TableCell className="text-right font-semibold">{l.details?.net_quantity ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}