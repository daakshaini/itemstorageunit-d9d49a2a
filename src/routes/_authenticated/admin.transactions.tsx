import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTransactions,
});

type Log = {
  id: string;
  username: string;
  action: string;
  item_name: string | null;
  created_at: string;
  details: { quantity?: number; net_quantity?: number; part_number?: string; direction?: string } | null;
};

function classifyDirection(l: Log): "add" | "remove" {
  if (l.action === "create") return "add";
  if (l.action === "delete") return "remove";
  return l.details?.direction === "remove" ? "remove" : "add";
}

function AdminTransactions() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "add" | "remove">("all");

  const load = async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("id, username, action, item_name, created_at, details")
      .order("created_at", { ascending: false })
      .limit(1000);
    setLogs((data ?? []) as Log[]);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Transaction History — Admin";
    load();
    const channel = supabase
      .channel("admin-transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        const dir = classifyDirection(l);
        if (filter !== "all" && dir !== filter) return false;
        if (!q) return true;
        const ql = q.toLowerCase();
        return l.username.toLowerCase().includes(ql) || (l.item_name ?? "").toLowerCase().includes(ql);
      }),
    [logs, q, filter]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Item Transaction History</h1>
        <p className="text-muted-foreground text-sm">Every add and remove action across all users.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user or item..." className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "add", "remove"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm border capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No transactions yet.</div>
        ) : (
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Net Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const dir = classifyDirection(l);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">@{l.username}</TableCell>
                    <TableCell>
                      <Badge variant={dir === "remove" ? "destructive" : "secondary"} className="gap-1">
                        {dir === "add" ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                        {dir === "add" ? "Added" : "Removed"}
                      </Badge>
                    </TableCell>
                    <TableCell>{l.item_name ?? "—"}</TableCell>
                    <TableCell className="text-right">{l.details?.quantity ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{l.details?.net_quantity ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}