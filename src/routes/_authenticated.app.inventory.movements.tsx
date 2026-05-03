import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/inventory/movements")({
  component: MovementsPage,
});

type Item = { id: string; sku: string; name: string; unit: string };
type WH = { id: string; name: string };
type Txn = {
  id: string; item_id: string; warehouse_id: string; txn_type: string;
  quantity: number; unit_cost: number; total_value: number;
  freight: number; duty: number; other_landed: number;
  reference_type: string | null; notes: string | null; occurred_at: string;
};

type Mode = "receipt" | "issue" | "transfer" | "adjustment";

function MovementsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement") || hasRole("production");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("receipt");
  const [form, setForm] = useState({
    item_id: "", warehouse_id: "", to_warehouse_id: "",
    quantity: "1", unit_cost: "0", batch_no: "",
    freight: "0", duty: "0", other: "0", notes: "",
  });

  const { data: items } = useQuery({
    enabled: !!company?.id,
    queryKey: ["items-min", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, sku, name, unit").eq("company_id", company!.id).order("name");
      if (error) throw error;
      return data as Item[];
    },
  });
  const { data: whs } = useQuery({
    enabled: !!company?.id,
    queryKey: ["whs-min", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("id, name").eq("company_id", company!.id).order("name");
      if (error) throw error;
      return data as WH[];
    },
  });
  const { data: txns } = useQuery({
    enabled: !!company?.id,
    queryKey: ["txns", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_transactions").select("*")
        .eq("company_id", company!.id).order("occurred_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Txn[];
    },
  });

  const itemMap = useMemo(() => new Map((items ?? []).map((i) => [i.id, i])), [items]);
  const whMap = useMemo(() => new Map((whs ?? []).map((w) => [w.id, w])), [whs]);

  const reset = () => setForm({ item_id: "", warehouse_id: "", to_warehouse_id: "", quantity: "1", unit_cost: "0", batch_no: "", freight: "0", duty: "0", other: "0", notes: "" });

  const submit = async () => {
    if (!form.item_id || !form.warehouse_id) { toast.error("Item and warehouse required"); return; }
    const qty = Number(form.quantity) || 0;
    if (qty <= 0) { toast.error("Quantity must be positive"); return; }
    try {
      if (mode === "receipt") {
        const { error } = await supabase.rpc("post_stock_receipt", {
          _company_id: company!.id, _item_id: form.item_id, _warehouse_id: form.warehouse_id,
          _quantity: qty, _unit_cost: Number(form.unit_cost) || 0,
          _batch_no: form.batch_no.trim() || `B-${Date.now()}`,
          _freight: Number(form.freight) || 0, _duty: Number(form.duty) || 0, _other: Number(form.other) || 0,
          _expiry: undefined, _ref_type: "manual", _ref_id: undefined, _notes: form.notes.trim() || undefined,
        });
        if (error) throw error;
      } else if (mode === "issue") {
        const { error } = await supabase.rpc("post_stock_issue", {
          _company_id: company!.id, _item_id: form.item_id, _warehouse_id: form.warehouse_id,
          _quantity: qty, _ref_type: "manual", _ref_id: undefined,
          _notes: form.notes.trim() || undefined, _txn_type: "issue",
        });
        if (error) throw error;
      } else if (mode === "transfer") {
        if (!form.to_warehouse_id || form.to_warehouse_id === form.warehouse_id) {
          toast.error("Choose a different destination warehouse"); return;
        }
        // FIFO take from source then receipt at destination at avg cost
        const { data: cost, error: e1 } = await supabase.rpc("post_stock_issue", {
          _company_id: company!.id, _item_id: form.item_id, _warehouse_id: form.warehouse_id,
          _quantity: qty, _ref_type: "transfer", _ref_id: undefined,
          _notes: form.notes.trim() || undefined, _txn_type: "transfer_out",
        });
        if (e1) throw e1;
        const unitCost = qty > 0 ? (Number(cost) || 0) / qty : 0;
        const { error: e2 } = await supabase.rpc("post_stock_receipt", {
          _company_id: company!.id, _item_id: form.item_id, _warehouse_id: form.to_warehouse_id,
          _quantity: qty, _unit_cost: unitCost,
          _batch_no: form.batch_no.trim() || `XFER-${Date.now()}`,
          _freight: 0, _duty: 0, _other: 0,
          _expiry: undefined, _ref_type: "transfer", _ref_id: undefined, _notes: form.notes.trim() || undefined,
        });
        if (e2) throw e2;
      } else {
        // adjustment - signed quantity (positive = add, negative = remove)
        const signed = Number(form.quantity); // can be negative
        if (signed >= 0) {
          const { error } = await supabase.rpc("post_stock_receipt", {
            _company_id: company!.id, _item_id: form.item_id, _warehouse_id: form.warehouse_id,
            _quantity: signed, _unit_cost: Number(form.unit_cost) || 0,
            _batch_no: form.batch_no.trim() || `ADJ-${Date.now()}`,
            _freight: 0, _duty: 0, _other: 0,
            _expiry: undefined, _ref_type: "adjustment", _ref_id: undefined, _notes: form.notes.trim() || undefined,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.rpc("post_stock_issue", {
            _company_id: company!.id, _item_id: form.item_id, _warehouse_id: form.warehouse_id,
            _quantity: Math.abs(signed), _ref_type: "adjustment", _ref_id: undefined,
            _notes: form.notes.trim() || undefined, _txn_type: "adjustment",
          });
          if (error) throw error;
        }
      }
      toast.success("Stock movement recorded");
      setOpen(false); reset();
      qc.invalidateQueries({ queryKey: ["txns"] });
      qc.invalidateQueries({ queryKey: ["item-levels"] });
      qc.invalidateQueries({ queryKey: ["inv-overview"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const typeIcon = (t: string) => {
    if (t === "receipt" || t === "transfer_in" || t === "production_in") return <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-600" />;
    if (t === "issue" || t === "transfer_out" || t === "production_out") return <ArrowUpFromLine className="h-3.5 w-3.5 text-red-600" />;
    return <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{txns?.length ?? 0} recent movements</div>
        {canEdit && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New movement</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New stock movement</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt (inward)</SelectItem>
                      <SelectItem value="issue">Issue (outward)</SelectItem>
                      <SelectItem value="transfer">Transfer between warehouses</SelectItem>
                      <SelectItem value="adjustment">Adjustment (+/-)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Item</Label>
                  <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>
                      {(items ?? []).map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{mode === "transfer" ? "From warehouse" : "Warehouse"}</Label>
                    <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {(whs ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {mode === "transfer" && (
                    <div>
                      <Label>To warehouse</Label>
                      <Select value={form.to_warehouse_id} onValueChange={(v) => setForm({ ...form, to_warehouse_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {(whs ?? []).map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity {mode === "adjustment" && "(+/-)"}</Label>
                    <Input type="number" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  {(mode === "receipt" || (mode === "adjustment" && Number(form.quantity) >= 0)) && (
                    <div><Label>Unit cost (₹)</Label><Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} /></div>
                  )}
                </div>
                {(mode === "receipt" || mode === "transfer" || mode === "adjustment") && (
                  <div><Label>Batch / lot no.</Label><Input value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} placeholder="auto-generated if blank" /></div>
                )}
                {mode === "receipt" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>Freight (₹)</Label><Input type="number" step="0.01" value={form.freight} onChange={(e) => setForm({ ...form, freight: e.target.value })} /></div>
                    <div><Label>Duty (₹)</Label><Input type="number" step="0.01" value={form.duty} onChange={(e) => setForm({ ...form, duty: e.target.value })} /></div>
                    <div><Label>Other (₹)</Label><Input type="number" step="0.01" value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} /></div>
                  </div>
                )}
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Post</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(txns ?? []).map((t) => {
                const it = itemMap.get(t.item_id);
                const wh = whMap.get(t.warehouse_id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(t.occurred_at).toLocaleString()}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5 text-xs">{typeIcon(t.txn_type)}<Badge variant="outline">{t.txn_type}</Badge></span></TableCell>
                    <TableCell className="font-medium">{it?.name ?? "—"}</TableCell>
                    <TableCell>{wh?.name ?? "—"}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(t.quantity) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {Number(t.quantity) > 0 ? "+" : ""}{Number(t.quantity).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">₹{Number(t.total_value).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.reference_type ?? ""}</TableCell>
                  </TableRow>
                );
              })}
              {!txns?.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No movements yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}