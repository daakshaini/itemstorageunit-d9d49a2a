import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Ban, CheckCircle2, Trash2, Eye } from "lucide-react";
import { logAdminAction } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string;
  username: string;
  created_at: string;
  blocked: boolean;
  itemCount: number;
  isAdmin: boolean;
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [viewItems, setViewItems] = useState<{ username: string; items: { id: string; part_number: string; item_name: string; quantity: number }[] } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: items }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, username, created_at, blocked").order("created_at", { ascending: false }),
      supabase.from("items").select("user_id"),
      supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
    ]);
    const counts = new Map<string, number>();
    (items ?? []).forEach((i: { user_id: string }) => counts.set(i.user_id, (counts.get(i.user_id) ?? 0) + 1));
    const adminSet = new Set((roles ?? []).map((r: { user_id: string }) => r.user_id));
    setRows(((profiles ?? []) as { id: string; username: string; created_at: string; blocked: boolean }[]).map((p) => ({
      ...p,
      itemCount: counts.get(p.id) ?? 0,
      isAdmin: adminSet.has(p.id),
    })));
    setLoading(false);
  };

  useEffect(() => {
    document.title = "User Management — Admin";
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => r.username.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  const toggleBlock = async (r: Row) => {
    const { error } = await supabase.from("profiles").update({ blocked: !r.blocked }).eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      action: r.blocked ? "unblock_user" : "block_user",
      targetType: "user",
      targetId: r.id,
      targetLabel: r.username,
    });
    toast.success(r.blocked ? "User unblocked" : "User blocked");
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, blocked: !x.blocked } : x)));
  };

  const deleteUser = async (r: Row) => {
    if (r.isAdmin) return toast.error("Cannot delete an admin");
    if (!confirm(`Delete user @${r.username} and all their items? This cannot be undone.`)) return;
    const { error } = await supabase.from("profiles").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    await logAdminAction({
      action: "delete_user",
      targetType: "user",
      targetId: r.id,
      targetLabel: r.username,
    });
    toast.success("User deleted");
    setRows((prev) => prev.filter((x) => x.id !== r.id));
  };

  const viewUserItems = async (r: Row) => {
    const { data, error } = await supabase
      .from("items")
      .select("id, part_number, item_name, quantity")
      .eq("user_id", r.id)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setViewItems({ username: r.username, items: data ?? [] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm">View, search, block, or remove users.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username..." className="pl-9" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">No users found.</div>
        ) : (
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">@{r.username}</TableCell>
                  <TableCell>
                    {r.isAdmin ? <Badge className="bg-primary">Admin</Badge> : <Badge variant="secondary">User</Badge>}
                  </TableCell>
                  <TableCell>
                    {r.blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="outline" className="text-green-700 border-green-300">Active</Badge>}
                  </TableCell>
                  <TableCell className="text-right">{r.itemCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => viewUserItems(r)} title="View items">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleBlock(r)} title={r.blocked ? "Unblock" : "Block"} disabled={r.isAdmin}>
                        {r.blocked ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Ban className="w-4 h-4 text-orange-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteUser(r)} title="Delete" disabled={r.isAdmin} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {viewItems && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setViewItems(null)}>
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold">Items by @{viewItems.username}</h3>
              <Button variant="ghost" size="sm" onClick={() => setViewItems(null)}>Close</Button>
            </div>
            <div className="p-5">
              {viewItems.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">This user has no items.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewItems.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-sm">{i.part_number}</TableCell>
                        <TableCell>{i.item_name}</TableCell>
                        <TableCell className="text-right">{i.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}