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
import { Plus, Undo2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/sales/returns")({
  component: ReturnsPage,
});

type Row = {
  id: string; return_no: string; return_date: string; status: string;
  reason: string | null; subtotal: number; tax_amount: number; total: number;
  customer: { name: string } | null; invoice: { invoice_number: string } | null;
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-muted text-foreground",
  approved: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  received: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive",
};

function ReturnsPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const canEdit = isCompanyAdmin || hasRole("sales");

  const { data, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["sales_returns", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_returns" as never)
        .select("*, customer:customers(name), invoice:invoices(invoice_number)")
        .eq("company_id", company!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sales Returns</h2>
          <p className="text-sm text-muted-foreground">Track goods returned by customers against invoices.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New return</Button>
            </DialogTrigger>
            <ReturnDialog onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["sales_returns", company?.id] }); }} />
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {canEdit && <TableHead className="text-right w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-12">
                  <Undo2 className="mx-auto h-8 w-8 mb-2 opacity-50" />No returns yet
                </TableCell></TableRow>
              )}
              {(data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.return_no}</TableCell>
                  <TableCell>{r.return_date}</TableCell>
                  <TableCell>{r.customer?.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.invoice?.invoice_number ?? "—"}</TableCell>
                  <TableCell><Badge className={STATUS_TONE[r.status] ?? ""} variant="secondary">{r.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">₹{Number(r.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <RowActions
                        table="sales_returns"
                        id={r.id}
                        label={`return "${r.return_no}"`}
                        canDelete={r.status === "draft" || r.status === "cancelled"}
                        invalidateKeys={[["sales_returns", company?.id]]}
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

type LineItem = { item_id: string; qty: number; rate: number; tax_pct: number };

function ReturnDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { company, user } = useAuth();
  const [form, setForm] = useState({ return_no: `SR-${Date.now().toString().slice(-6)}`, customer_id: "", invoice_id: "", reason: "", notes: "", return_date: new Date().toISOString().slice(0, 10) });
  const [lines, setLines] = useState<LineItem[]>([{ item_id: "", qty: 1, rate: 0, tax_pct: 18 }]);
  const [saving, setSaving] = useState(false);

  const { data: customers } = useQuery({
    enabled: !!company?.id,
    queryKey: ["ret-customers", company?.id],
    queryFn: async () => (await supabase.from("customers").select("id,name").eq("company_id", company!.id).order("name")).data ?? [],
  });
  const { data: invoices } = useQuery({
    enabled: !!company?.id && !!form.customer_id,
    queryKey: ["ret-invoices", form.customer_id],
    queryFn: async () => (await supabase.from("invoices").select("id,invoice_number").eq("customer_id", form.customer_id)).data ?? [],
  });
  const { data: items } = useQuery({
    enabled: !!company?.id,
    queryKey: ["ret-items", company?.id],
    queryFn: async () => (await supabase.from("items").select("id,name,sku").eq("company_id", company!.id).order("name")).data ?? [],
  });

  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const taxAmount = lines.reduce((s, l) => s + (l.qty * l.rate * l.tax_pct) / 100, 0);
  const total = subtotal + taxAmount;

  const submit = async () => {
    if (!company?.id) return;
    if (!form.customer_id) { toast.error("Select a customer"); return; }
    const valid = lines.filter((l) => l.item_id && l.qty > 0);
    if (valid.length === 0) { toast.error("Add at least one item"); return; }
    setSaving(true);
    const { data: ret, error } = await supabase.from("sales_returns" as never).insert({
      company_id: company.id, return_no: form.return_no, customer_id: form.customer_id,
      invoice_id: form.invoice_id || null, reason: form.reason || null, notes: form.notes || null,
      return_date: form.return_date, subtotal, tax_amount: taxAmount, total, created_by: user?.id,
    } as never).select("id").single();
    if (error || !ret) { setSaving(false); toast.error(error?.message ?? "Failed"); return; }
    const { error: itemsErr } = await supabase.from("sales_return_items" as never).insert(
      valid.map((l) => ({
        return_id: (ret as { id: string }).id, item_id: l.item_id, qty: l.qty, rate: l.rate,
        tax_pct: l.tax_pct, tax_amount: (l.qty * l.rate * l.tax_pct) / 100, line_total: l.qty * l.rate * (1 + l.tax_pct / 100),
      })) as never,
    );
    setSaving(false);
    if (itemsErr) { toast.error(itemsErr.message); return; }
    toast.success("Return created");
    onSaved();
  };

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader><DialogTitle>New sales return</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Return #"><Input value={form.return_no} onChange={(e) => setForm({ ...form, return_no: e.target.value })} /></Field>
        <Field label="Date"><Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></Field>
        <Field label="Customer *"><Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v, invoice_id: "" })}><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Original invoice"><Select value={form.invoice_id} onValueChange={(v) => setForm({ ...form, invoice_id: v })}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{(invoices ?? []).map((i) => <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Reason" className="sm:col-span-2"><Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Items</Label>
          <Button size="sm" variant="outline" onClick={() => setLines([...lines, { item_id: "", qty: 1, rate: 0, tax_pct: 18 }])}><Plus className="h-3 w-3 mr-1" />Row</Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="w-24">Qty</TableHead><TableHead className="w-28">Rate</TableHead><TableHead className="w-24">Tax %</TableHead><TableHead className="w-28 text-right">Line</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
            <TableBody>
              {lines.map((l, idx) => (
                <TableRow key={idx}>
                  <TableCell><Select value={l.item_id} onValueChange={(v) => { const n = [...lines]; n[idx] = { ...l, item_id: v }; setLines(n); }}><SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger><SelectContent>{(items ?? []).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell><Input type="number" min="0" value={l.qty} onChange={(e) => { const n = [...lines]; n[idx] = { ...l, qty: Number(e.target.value) }; setLines(n); }} /></TableCell>
                  <TableCell><Input type="number" min="0" value={l.rate} onChange={(e) => { const n = [...lines]; n[idx] = { ...l, rate: Number(e.target.value) }; setLines(n); }} /></TableCell>
                  <TableCell><Input type="number" min="0" value={l.tax_pct} onChange={(e) => { const n = [...lines]; n[idx] = { ...l, tax_pct: Number(e.target.value) }; setLines(n); }} /></TableCell>
                  <TableCell className="text-right font-mono text-sm">₹{(l.qty * l.rate * (1 + l.tax_pct / 100)).toFixed(2)}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-3 text-right text-sm space-y-1">
          <div>Subtotal: <span className="font-mono">₹{subtotal.toFixed(2)}</span></div>
          <div>Tax: <span className="font-mono">₹{taxAmount.toFixed(2)}</span></div>
          <div className="font-semibold">Total: <span className="font-mono">₹{total.toFixed(2)}</span></div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Create return"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label><div className="mt-1.5">{children}</div></div>;
}