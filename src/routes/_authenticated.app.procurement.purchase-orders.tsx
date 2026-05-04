import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PoStatusBadge } from "./_authenticated.app.procurement.index";

export const Route = createFileRoute("/_authenticated/app/procurement/purchase-orders")({
  component: PurchaseOrdersPage,
});

function PurchaseOrdersPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("procurement");
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [items, setItems] = useState<{ name: string; qty: string; price: string; tax: string }[]>([{ name: "", qty: "1", price: "0", tax: "18" }]);

  const { data: pos } = useQuery({
    enabled: !!company?.id,
    queryKey: ["purchase-orders", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*, suppliers(name)").eq("company_id", company!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: suppliers } = useQuery({
    enabled: !!company?.id,
    queryKey: ["suppliers-active", company?.id],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, name").eq("company_id", company!.id).eq("is_active", true);
      return data ?? [];
    },
  });

  const totals = items.reduce((acc, it) => {
    const lt = (Number(it.qty) || 0) * (Number(it.price) || 0);
    const tax = lt * (Number(it.tax) || 0) / 100;
    return { sub: acc.sub + lt, tax: acc.tax + tax };
  }, { sub: 0, tax: 0 });

  const create = async () => {
    if (!supplierId) { toast.error("Pick a supplier"); return; }
    const valid = items.filter(i => i.name.trim());
    if (!valid.length) { toast.error("Add at least one line"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { data: num } = await supabase.rpc("next_proc_number", { _company_id: company!.id, _prefix: "PO" });
    const grand = totals.sub + totals.tax;
    const { data: po, error } = await supabase.from("purchase_orders").insert({
      company_id: company!.id, po_number: num as string, supplier_id: supplierId,
      status: "pending_approval", expected_date: expectedDate || null,
      subtotal: totals.sub, tax_total: totals.tax, grand_total: grand, created_by: u.user?.id ?? null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("purchase_order_items").insert(valid.map((it, idx) => {
      const lt = (Number(it.qty) || 0) * (Number(it.price) || 0);
      return {
        company_id: company!.id, po_id: po!.id, item_name: it.name.trim(),
        quantity: Number(it.qty) || 0, unit_price: Number(it.price) || 0,
        tax_percent: Number(it.tax) || 0, line_total: lt, position: idx,
      };
    }));
    toast.success(`PO ${num} created and submitted for approval`);
    setOpen(false);
    setItems([{ name: "", qty: "1", price: "0", tax: "18" }]); setSupplierId(""); setExpectedDate("");
    qc.invalidateQueries({ queryKey: ["purchase-orders"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Purchase Orders</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New PO</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Create purchase order</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Supplier *</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Expected delivery</Label><Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Line items</Label>
                  {items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[1fr_70px_90px_70px_36px] gap-2">
                      <Input placeholder="Item" value={it.name} onChange={e => { const c = [...items]; c[i].name = e.target.value; setItems(c); }} />
                      <Input type="number" placeholder="Qty" value={it.qty} onChange={e => { const c = [...items]; c[i].qty = e.target.value; setItems(c); }} />
                      <Input type="number" placeholder="Price" value={it.price} onChange={e => { const c = [...items]; c[i].price = e.target.value; setItems(c); }} />
                      <Input type="number" placeholder="Tax%" value={it.tax} onChange={e => { const c = [...items]; c[i].tax = e.target.value; setItems(c); }} />
                      <Button variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setItems([...items, { name: "", qty: "1", price: "0", tax: "18" }])}><Plus className="h-3 w-3 mr-1" />Add line</Button>
                </div>
                <div className="text-right text-sm">Subtotal: ₹{totals.sub.toFixed(2)} · Tax: ₹{totals.tax.toFixed(2)} · <strong>Grand: ₹{(totals.sub + totals.tax).toFixed(2)}</strong></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Submit for approval</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>PO #</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Order date</TableHead><TableHead>Expected</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-12"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(pos?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12"><FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />No purchase orders yet.</TableCell></TableRow>
              ) : pos!.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.po_number}</TableCell>
                  <TableCell>{p.suppliers?.name ?? "—"}</TableCell>
                  <TableCell><PoStatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.order_date}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.expected_date ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">₹{Number(p.grand_total).toLocaleString("en-IN")}</TableCell>
                  <TableCell><Button asChild size="sm" variant="ghost"><Link to="/app/procurement/purchase-orders/$id" params={{ id: p.id }}><Eye className="h-4 w-4" /></Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}