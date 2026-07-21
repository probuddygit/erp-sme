import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/sales/deliveries")({
  component: DeliveriesPage,
});

type Row = { id: string; dn_no: string; delivery_date: string; status: string; vehicle_no: string | null; driver_name: string | null; customer: { name: string } | null };

const TONE: Record<string, string> = {
  draft: "bg-muted text-foreground",
  dispatched: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  delivered: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive",
};

function DeliveriesPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const canEdit = isCompanyAdmin || hasRole("sales");

  const { data, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["delivery_notes", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_notes" as never)
        .select("*, customer:customers(name)")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("delivery_notes" as never).update({ status } as never).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Marked ${status}`); qc.invalidateQueries({ queryKey: ["delivery_notes", company?.id] }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">Delivery Notes</h2>
          <p className="text-sm text-muted-foreground">Dispatch documents for goods leaving your warehouse.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New delivery note</Button></DialogTrigger>
            <DeliveryDialog onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["delivery_notes", company?.id] }); }} />
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DN #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right w-56">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-12">
                  <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />No delivery notes yet
                </TableCell></TableRow>
              )}
              {(data ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.dn_no}</TableCell>
                  <TableCell>{d.delivery_date}</TableCell>
                  <TableCell>{d.customer?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{d.vehicle_no ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.driver_name ?? "—"}</TableCell>
                  <TableCell><Badge className={TONE[d.status] ?? ""} variant="secondary">{d.status}</Badge></TableCell>
                  {canEdit && (
                    <TableCell className="text-right space-x-1">
                      {d.status === "draft" && <Button size="sm" variant="outline" onClick={() => updateStatus(d.id, "dispatched")}>Dispatch</Button>}
                      {d.status === "dispatched" && <Button size="sm" variant="outline" onClick={() => updateStatus(d.id, "delivered")}>Deliver</Button>}
                      <RowActions
                        table="delivery_notes"
                        id={d.id}
                        label={`delivery note "${d.dn_no}"`}
                        canDelete={d.status === "draft" || d.status === "cancelled"}
                        invalidateKeys={[["delivery_notes", company?.id]]}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type Line = { item_id: string; qty: number };

function DeliveryDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { company, user } = useAuth();
  const [form, setForm] = useState({ dn_no: `DN-${Date.now().toString().slice(-6)}`, customer_id: "", sales_order_id: "", vehicle_no: "", driver_name: "", driver_phone: "", notes: "", delivery_date: new Date().toISOString().slice(0, 10) });
  const [lines, setLines] = useState<Line[]>([{ item_id: "", qty: 1 }]);
  const [saving, setSaving] = useState(false);

  const { data: customers } = useQuery({ enabled: !!company?.id, queryKey: ["dn-customers", company?.id], queryFn: async () => (await supabase.from("customers").select("id,name").eq("company_id", company!.id).order("name")).data ?? [] });
  const { data: orders } = useQuery({ enabled: !!form.customer_id, queryKey: ["dn-orders", form.customer_id], queryFn: async () => (await supabase.from("sales_orders").select("id,order_number").eq("customer_id", form.customer_id)).data ?? [] });
  const { data: items } = useQuery({ enabled: !!company?.id, queryKey: ["dn-items", company?.id], queryFn: async () => (await supabase.from("items").select("id,name").eq("company_id", company!.id).order("name")).data ?? [] });

  const submit = async () => {
    if (!company?.id || !form.customer_id) { toast.error("Select a customer"); return; }
    const valid = lines.filter((l) => l.item_id && l.qty > 0);
    if (valid.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    const { data: dn, error } = await supabase.from("delivery_notes" as never).insert({
      company_id: company.id, dn_no: form.dn_no, customer_id: form.customer_id,
      sales_order_id: form.sales_order_id || null, delivery_date: form.delivery_date,
      vehicle_no: form.vehicle_no || null, driver_name: form.driver_name || null,
      driver_phone: form.driver_phone || null, notes: form.notes || null, created_by: user?.id,
    } as never).select("id").single();
    if (error || !dn) { setSaving(false); toast.error(error?.message ?? "Failed"); return; }
    const { error: e2 } = await supabase.from("delivery_note_items" as never).insert(
      valid.map((l) => ({ dn_id: (dn as { id: string }).id, item_id: l.item_id, qty: l.qty })) as never,
    );
    setSaving(false);
    if (e2) { toast.error(e2.message); return; }
    toast.success("Delivery note created");
    onSaved();
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader><DialogTitle>New delivery note</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="DN #"><Input value={form.dn_no} onChange={(e) => setForm({ ...form, dn_no: e.target.value })} /></Field>
        <Field label="Delivery date"><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} /></Field>
        <Field label="Customer *"><Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v, sales_order_id: "" })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Sales order"><Select value={form.sales_order_id} onValueChange={(v) => setForm({ ...form, sales_order_id: v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{(orders ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Vehicle #"><Input value={form.vehicle_no} onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })} /></Field>
        <Field label="Driver name"><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></Field>
        <Field label="Driver phone"><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" onClick={() => setLines([...lines, { item_id: "", qty: 1 }])}><Plus className="h-3 w-3 mr-1" />Row</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="w-28">Qty</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {lines.map((l, idx) => (
                <TableRow key={idx}>
                  <TableCell><Select value={l.item_id} onValueChange={(v) => { const n = [...lines]; n[idx] = { ...l, item_id: v }; setLines(n); }}><SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger><SelectContent>{(items ?? []).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell><Input type="number" min="0" value={l.qty} onChange={(e) => { const n = [...lines]; n[idx] = { ...l, qty: Number(e.target.value) }; setLines(n); }} /></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}