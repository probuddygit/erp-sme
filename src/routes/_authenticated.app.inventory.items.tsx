import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/inventory/items")({
  component: ItemsPage,
});

type ItemRow = {
  id: string; sku: string; name: string; item_type: "raw_material"|"wip"|"finished_good"|"consumable"|"service";
  unit: string; min_stock: number; reorder_qty: number; standard_cost: number;
  valuation_method: "fifo"|"weighted_average"; is_active: boolean;
};
type Level = { item_id: string; warehouse_id: string; on_hand: number; value: number };

const TYPE_LABEL: Record<ItemRow["item_type"], string> = {
  raw_material: "Raw material", wip: "Work-in-progress", finished_good: "Finished good",
  consumable: "Consumable", service: "Service",
};

function ItemsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement") || hasRole("production");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    sku: "", name: "", item_type: "raw_material" as ItemRow["item_type"], unit: "pcs",
    min_stock: "0", reorder_qty: "0", standard_cost: "0",
    valuation_method: "weighted_average" as ItemRow["valuation_method"],
  });

  const { data: items } = useQuery({
    enabled: !!company?.id,
    queryKey: ["items", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").eq("company_id", company!.id).order("name");
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  const { data: levels } = useQuery({
    enabled: !!company?.id,
    queryKey: ["item-levels", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("item_stock_levels", { _company_id: company!.id });
      if (error) throw error;
      return (data ?? []) as Level[];
    },
  });

  const rows = useMemo(() => {
    const list = items ?? [];
    const map = new Map<string, { on_hand: number; value: number }>();
    (levels ?? []).forEach((l) => {
      const cur = map.get(l.item_id) ?? { on_hand: 0, value: 0 };
      map.set(l.item_id, { on_hand: cur.on_hand + Number(l.on_hand), value: cur.value + Number(l.value) });
    });
    return list
      .filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.sku.toLowerCase().includes(q.toLowerCase()))
      .map((i) => {
        const lv = map.get(i.id) ?? { on_hand: 0, value: 0 };
        return { ...i, on_hand: lv.on_hand, value: lv.value, low: Number(i.min_stock) > 0 && lv.on_hand < Number(i.min_stock) };
      });
  }, [items, levels, q]);

  const create = async () => {
    if (!form.sku.trim() || !form.name.trim()) { toast.error("SKU and name required"); return; }
    const { error } = await supabase.from("items").insert({
      company_id: company!.id,
      sku: form.sku.trim(), name: form.name.trim(), item_type: form.item_type, unit: form.unit.trim() || "pcs",
      min_stock: Number(form.min_stock) || 0, reorder_qty: Number(form.reorder_qty) || 0,
      standard_cost: Number(form.standard_cost) || 0, valuation_method: form.valuation_method,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Item created");
    setOpen(false);
    setForm({ sku: "", name: "", item_type: "raw_material", unit: "pcs", min_stock: "0", reorder_qty: "0", standard_cost: "0", valuation_method: "weighted_average" });
    qc.invalidateQueries({ queryKey: ["items"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New item</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New item</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>SKU *</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v as ItemRow["item_type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TYPE_LABEL) as ItemRow["item_type"][]).map((k) => (
                          <SelectItem key={k} value={k}>{TYPE_LABEL[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Min stock</Label><Input type="number" step="0.001" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
                  <div><Label>Reorder qty</Label><Input type="number" step="0.001" value={form.reorder_qty} onChange={(e) => setForm({ ...form, reorder_qty: e.target.value })} /></div>
                  <div><Label>Std. cost (₹)</Label><Input type="number" step="0.01" value={form.standard_cost} onChange={(e) => setForm({ ...form, standard_cost: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Valuation method</Label>
                  <Select value={form.valuation_method} onValueChange={(v) => setForm({ ...form, valuation_method: v as ItemRow["valuation_method"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weighted_average">Weighted average</SelectItem>
                      <SelectItem value="fifo">FIFO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell><Badge variant="outline">{TYPE_LABEL[r.item_type]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <span className={r.low ? "text-destructive font-semibold" : ""}>
                      {r.low && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                      {Number(r.on_hand).toFixed(2)} {r.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{Number(r.min_stock)}</TableCell>
                  <TableCell className="text-right">₹{Number(r.value).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.valuation_method === "fifo" ? "FIFO" : "Avg"}</TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No items.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}