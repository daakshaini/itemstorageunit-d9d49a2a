import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/items/new")({
  component: NewItemPage,
});

function NewItemPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ part_number: "", item_name: "", item_price: "", quantity: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Add Item — InventoryHub"; }, []);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.part_number || !form.item_name) return toast.error("Fill all fields");
    const price = parseFloat(form.item_price);
    const qty = parseInt(form.quantity, 10);
    if (isNaN(price) || price < 0) return toast.error("Invalid price");
    if (isNaN(qty) || qty < 0) return toast.error("Invalid quantity");

    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { setLoading(false); return toast.error("Not authenticated"); }

    const { error } = await supabase.from("items").insert({
      user_id: userRes.user.id,
      part_number: form.part_number.trim(),
      item_name: form.item_name.trim(),
      item_price: price,
      quantity: qty,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Item added");
    navigate({ to: "/inventory" });
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-8">
        <div className="flex items-center gap-2 text-primary mb-6">
          <PackagePlus className="w-7 h-7" />
          <h1 className="text-2xl font-bold">Add New Item</h1>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="pn">Part Number</Label>
            <Input id="pn" value={form.part_number} onChange={(e) => update("part_number", e.target.value)} placeholder="e.g. PN-001" required />
          </div>
          <div>
            <Label htmlFor="nm">Item Name</Label>
            <Input id="nm" value={form.item_name} onChange={(e) => update("item_name", e.target.value)} placeholder="e.g. Steel Bolt" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pr">Item Price</Label>
              <Input id="pr" type="number" step="0.01" min="0" value={form.item_price} onChange={(e) => update("item_price", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="qt">Quantity</Label>
              <Input id="qt" type="number" min="0" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} required />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Saving..." : "Submit"}</Button>
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/inventory" })}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}