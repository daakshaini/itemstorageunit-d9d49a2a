import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Boxes, Minus } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity";

type Item = {
  id: string;
  part_number: string;
  item_name: string;
  item_price: number;
  quantity: number;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Item[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "My Inventory — Item Storage Unit";
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const item = items.find((i) => i.id === id);
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity({ action: "delete", itemName: item?.item_name, itemId: id });
    toast.success("Item deleted");
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const adjustQuantity = async (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + delta);
    const { error } = await supabase.from("items").update({ quantity: newQty }).eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity({ action: "update", itemName: item.item_name, itemId: id, details: { from: item.quantity, to: newQty } });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i)));
  };

  const total = items.reduce((s, i) => s + i.item_price * i.quantity, 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Boxes className="w-7 h-7 text-primary" /> My Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Only your items are shown here.</p>
        </div>
        <Button asChild><Link to="/items/new"><Plus className="w-4 h-4 mr-1" /> Add Item</Link></Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Items" value={items.length.toString()} />
        <StatCard label="Total Quantity" value={items.reduce((s, i) => s + i.quantity, 0).toString()} />
        <StatCard label="Inventory Value" value={`$${total.toFixed(2)}`} />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-12 h-12 text-primary/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No items yet.</p>
            <Button asChild className="mt-4"><Link to="/items/new">Add your first item</Link></Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Added On</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-sm">{it.part_number}</TableCell>
                  <TableCell className="font-medium">{it.item_name}</TableCell>
                  <TableCell className="text-right">${Number(it.item_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustQuantity(it.id, -1)}><Minus className="w-3 h-3" /></Button>
                      <span className="w-8 text-center font-medium">{it.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => adjustQuantity(it.id, 1)}><Plus className="w-3 h-3" /></Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">${(it.item_price * it.quantity).toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(it.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(it.id)}
                      className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-primary mt-1">{value}</p>
    </Card>
  );
}