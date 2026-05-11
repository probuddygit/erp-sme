import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, PackageCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

type Search = { po?: string };

export const Route = createFileRoute("/_authenticated/app/procurement/grns")({
  validateSearch: (s: Record<string, unknown>): Search => ({ po: typeof s.po === "string" ? s.po : undefined }),
  component: GrnsPage,
});

function GrnsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement");
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState<string>(search.po ?? "");
  const [warehouseId, setWarehouseId] = useState("");
  const [freight, setFreight] = useState("0");
  const [duty, setDuty] = useState("0");
  const [lines, setLines] = useState<{ po_item_id: string; item_id: string | null; item_name: string; qty: string; unit_cost: string; batch: string }[]>([]);

  useEffect(() => { if (search.po) { setPoId(search.po); setOpen(true); } }, [search.po]);

  const { data: grns } = useQuery({
    enabled: !!company?.id,
    queryKey: ["grns", company?.id],
    queryFn: async () => {
      const { data } = await supabase.from("grns").select("*, suppliers(name), purchase_orders(po_number)").eq("company_id", company!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: openPOs } = useQuery({
    enabled: !!company?.id && open,
    queryKey: ["open-pos", company?.id],
    queryFn: async () => {
      const { data } = await supabase.from("purchase_orders").select("id, po_number, supplier_id, status").eq("company_id", company!.id).in("status", ["approved", "sent", "partially_received"]);
      return data ?? [];
    },
  });

  const { data: warehouses } = useQuery({
    enabled: !!company?.id && open,
    queryKey: ["wh-active", company?.id],
    queryFn: async () => (await supabase.from("warehouses").select("id, name").eq("company_id", company!.id)).data ?? [],
  });

  useEffect(() => {
    if (!poId) { setLines([]); return; }
    (async () => {
      const { data } = await supabase.from("purchase_order_items").select("id, item_id, item_name, quantity, received_quantity, unit_price").eq("po_id", poId);
      setLines((data ?? []).map(it => ({
        po_item_id: it.id, item_id: it.item_id, item_name: it.item_name,
        qty: String(Math.max(Number(it.quantity) - Number(it.received_quantity), 0)),
        unit_cost: String(it.unit_price), batch: "",
      })));
    })();
  }, [poId]);

  const submit = async () => {
    if (!poId) { toast.error("Pick a PO"); return; }
    const valid = lines.filter(l => Number(l.qty) > 0);
    if (!valid.length) { toast.error("Add quantities to receive"); return; }
    const po = openPOs?.find(p => p.id === poId);
    if (!po) { toast.error("PO not found"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { data: num } = await supabase.rpc("next_proc_number", { _company_id: company!.id, _prefix: "GRN" });
    const { data: grn, error } = await supabase.from("grns").insert({
      company_id: company!.id, grn_number: num as string, po_id: poId, supplier_id: po.supplier_id,
      warehouse_id: warehouseId || null, status: "posted",
      freight: Number(freight) || 0, duty: Number(duty) || 0, created_by: u.user?.id ?? null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    const { error: e2 } = await supabase.from("grn_items").insert(valid.map((l, i) => ({
      company_id: company!.id, grn_id: grn!.id, po_item_id: l.po_item_id, item_id: l.item_id,
      item_name: l.item_name, quantity: Number(l.qty), unit_cost: Number(l.unit_cost) || 0,
      warehouse_id: warehouseId || null, batch_no: l.batch || null, position: i,
    })));
    if (e2) { toast.error(e2.message); return; }
    // update PO status
    const { data: items2 } = await supabase.from("purchase_order_items").select("quantity, received_quantity").eq("po_id", poId);
    const fully = (items2 ?? []).every(it => Number(it.received_quantity) >= Number(it.quantity));
    await supabase.from("purchase_orders").update({ status: fully ? "received" : "partially_received" } as any).eq("id", poId);
    toast.success(`GRN ${num} posted`);
    setOpen(false); setPoId(""); setLines([]); setFreight("0"); setDuty("0");
    qc.invalidateQueries({ queryKey: ["grns"] });
    qc.invalidateQueries({ queryKey: ["po-detail"] });
    qc.invalidateQueries({ queryKey: ["purchase-orders"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Goods Receipt Notes</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New GRN</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Record goods receipt</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Purchase order *</Label>
                    <Select value={poId} onValueChange={setPoId}>
                      <SelectTrigger><SelectValue placeholder="Pick an open PO" /></SelectTrigger>
                      <SelectContent>{openPOs?.map(p => <SelectItem key={p.id} value={p.id}>{p.po_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Warehouse</Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger><SelectValue placeholder="Pick warehouse" /></SelectTrigger>
                      <SelectContent>{warehouses?.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {lines.length > 0 && (
                  <div className="space-y-2">
                    <Label>Receive lines</Label>
                    {lines.map((l, i) => (
                      <div key={l.po_item_id} className="grid grid-cols-[1fr_80px_90px_120px] gap-2">
                        <Input value={l.item_name} disabled />
                        <Input type="number" value={l.qty} onChange={e => { const c = [...lines]; c[i].qty = e.target.value; setLines(c); }} />
                        <Input type="number" value={l.unit_cost} onChange={e => { const c = [...lines]; c[i].unit_cost = e.target.value; setLines(c); }} />
                        <Input placeholder="Batch #" value={l.batch} onChange={e => { const c = [...lines]; c[i].batch = e.target.value; setLines(c); }} />
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Freight</Label><Input type="number" value={freight} onChange={e => setFreight(e.target.value)} /></div>
                  <div><Label>Duty</Label><Input type="number" value={duty} onChange={e => setDuty(e.target.value)} /></div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}><CheckCircle2 className="h-4 w-4 mr-1" />Post GRN</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>GRN #</TableHead><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Received</TableHead><TableHead className="w-20"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(grns?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12"><PackageCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />No goods receipts yet.</TableCell></TableRow>
              ) : grns!.map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono text-xs">{g.grn_number}</TableCell>
                  <TableCell className="font-mono text-xs">{g.purchase_orders?.po_number ?? "—"}</TableCell>
                  <TableCell>{g.suppliers?.name ?? "—"}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted">{g.status}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{g.received_date}</TableCell>
                  <TableCell>{canEdit && g.status === "draft" && (
                    <RowActions
                      label={`GRN ${g.grn_number}`}
                      invalidateKeys={[["grns", company?.id]]}
                      onDelete={async () => {
                        await supabase.from("grn_items").delete().eq("grn_id", g.id);
                        const { error } = await supabase.from("grns").delete().eq("id", g.id);
                        if (error) throw error;
                      }}
                    />
                  )}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}