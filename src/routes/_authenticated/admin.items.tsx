import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Boxes } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/items")({
  component: AdminItems,
});

type Row = {
  id: string;
  part_number: string;
  item_name: string;
  item_price: number;
  quantity: number;
  created_at: string;
  user_id: string;
  username?: string;
};

function AdminItems() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    const [{ data: items }, { data: profiles }] = await Promise.all([
      supabase.from("items").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username"),
    ]);
    const nameById = new Map((profiles ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));
    setRows(((items ?? []) as Row[]).map((i) => ({ ...i, username: nameById.get(i.user_id) })));
    setLoading(false);
  };

  useEffect(() => {
    document.title = "All Items — Admin";
    load();
    const channel = supabase
      .channel("items-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const ql = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.item_name.toLowerCase().includes(ql) ||
        r.part_number.toLowerCase().includes(ql) ||
        (r.username ?? "").toLowerCase().includes(ql),
    );
  }, [rows, q]);

  const totalQty = filtered.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalValue = filtered.reduce((s, r) => s + Number(r.item_price) * r.quantity, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Boxes className="w-7 h-7 text-primary" /> All Items
        </h1>
        <p className="text-muted-foreground text-sm">Complete inventory across every user.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Items</p>
          <p className="text-2xl font-bold text-primary">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Net Quantity</p>
          <p className="text-2xl font-bold text-primary">{totalQty}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Inventory Value</p>
          <p className="text-2xl font-bold text-primary">₹{totalValue.toFixed(2)}</p>
        </Card>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, part #, or user..." className="pl-9" />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No items found.</div>
        ) : (
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Net Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Added On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.part_number}</TableCell>
                  <TableCell className="font-medium">{r.item_name}</TableCell>
                  <TableCell>@{r.username ?? "unknown"}</TableCell>
                  <TableCell className="text-right">₹{Number(r.item_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{r.quantity}</TableCell>
                  <TableCell className="text-right">₹{(Number(r.item_price) * r.quantity).toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}