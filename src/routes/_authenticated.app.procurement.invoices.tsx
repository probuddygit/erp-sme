import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/procurement/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const canEdit = isCompanyAdmin || hasRole("finance") || hasRole("procurement");
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState("");
  const [supplierInvNo, setSupplierInvNo] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [subtotal, setSubtotal] = useState("0");
  const [tax, setTax] = useState("0");

  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("0");

  const { data: invoices } = useQuery({
    enabled: !!company?.id,
    queryKey: ["vinvoices", company?.id],
    queryFn: async () => (await supabase.from("vendor_invoices").select("*, suppliers(name), purchase_orders(po_number)").eq("company_id", company!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const { data: cashflow } = useQuery({
    enabled: !!company?.id,
    queryKey: ["cashflow", company?.id],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_invoices").select("amount_due, due_date, status").eq("company_id", company!.id).gt("amount_due", 0);
      const today = new Date().toISOString().slice(0, 10);
      const overdue = (data ?? []).filter(v => v.due_date && v.due_date < today).reduce((s, v) => s + Number(v.amount_due), 0);
      const upcoming = (data ?? []).filter(v => !v.due_date || v.due_date >= today).reduce((s, v) => s + Number(v.amount_due), 0);
      return { overdue, upcoming };
    },
  });

  const { data: openPOs } = useQuery({
    enabled: !!company?.id && open,
    queryKey: ["pos-for-invoice", company?.id],
    queryFn: async () => (await supabase.from("purchase_orders").select("id, po_number, supplier_id, grand_total").eq("company_id", company!.id).in("status", ["sent", "partially_received", "received"])).data ?? [],
  });

  const submit = async () => {
    if (!poId) { toast.error("Pick PO"); return; }
    const po = openPOs?.find(p => p.id === poId)!;
    const grand = (Number(subtotal) || 0) + (Number(tax) || 0);
    const { data: u } = await supabase.auth.getUser();
    const { data: num } = await supabase.rpc("next_proc_number", { _company_id: company!.id, _prefix: "VINV" });
    const matchOk = Math.abs(grand - Number(po.grand_total)) < 1;
    const { error } = await supabase.from("vendor_invoices").insert({
      company_id: company!.id, vinv_number: num as string, supplier_invoice_no: supplierInvNo || null,
      supplier_id: po.supplier_id, po_id: poId, invoice_date: invDate, due_date: dueDate || null,
      subtotal: Number(subtotal) || 0, tax_total: Number(tax) || 0, grand_total: grand, amount_due: grand,
      match_status: matchOk ? "matched" : "amount_mismatch", status: matchOk ? "matched" : "draft",
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Invoice ${num} created`);
    setOpen(false); setPoId(""); setSupplierInvNo(""); setSubtotal("0"); setTax("0"); setDueDate("");
    qc.invalidateQueries({ queryKey: ["vinvoices"] });
    qc.invalidateQueries({ queryKey: ["cashflow"] });
  };

  const pay = async () => {
    if (!payOpen) return;
    const inv = invoices?.find((v: any) => v.id === payOpen);
    if (!inv) return;
    const amt = Number(payAmount) || 0;
    if (amt <= 0) { toast.error("Amount required"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { data: num } = await supabase.rpc("next_proc_number", { _company_id: company!.id, _prefix: "PAY" });
    const { error } = await supabase.from("supplier_payments").insert({
      company_id: company!.id, payment_number: num as string, vinv_id: inv.id, supplier_id: inv.supplier_id,
      amount: amt, created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    const newPaid = Number(inv.amount_paid) + amt;
    const newDue = Math.max(Number(inv.grand_total) - newPaid, 0);
    await supabase.from("vendor_invoices").update({
      amount_paid: newPaid, amount_due: newDue,
      status: newDue === 0 ? "paid" : "partially_paid",
    } as any).eq("id", inv.id);
    toast.success(`Payment ${num} recorded`);
    setPayOpen(null); setPayAmount("0");
    qc.invalidateQueries({ queryKey: ["vinvoices"] });
    qc.invalidateQueries({ queryKey: ["cashflow"] });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Overdue payable</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-destructive">₹{(cashflow?.overdue ?? 0).toLocaleString("en-IN")}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Upcoming payable</CardTitle></CardHeader><CardContent className="text-2xl font-bold">₹{(cashflow?.upcoming ?? 0).toLocaleString("en-IN")}</CardContent></Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vendor invoices</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New invoice</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enter vendor invoice</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Purchase order *</Label>
                  <Select value={poId} onValueChange={setPoId}>
                    <SelectTrigger><SelectValue placeholder="Pick a PO" /></SelectTrigger>
                    <SelectContent>{openPOs?.map(p => <SelectItem key={p.id} value={p.id}>{p.po_number} (₹{Number(p.grand_total).toLocaleString("en-IN")})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Supplier invoice #</Label><Input value={supplierInvNo} onChange={e => setSupplierInvNo(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Invoice date</Label><Input type="date" value={invDate} onChange={e => setInvDate(e.target.value)} /></div>
                  <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Subtotal</Label><Input type="number" value={subtotal} onChange={e => setSubtotal(e.target.value)} /></div>
                  <div><Label>Tax</Label><Input type="number" value={tax} onChange={e => setTax(e.target.value)} /></div>
                </div>
                <div className="text-right text-sm">Grand: <strong>₹{((Number(subtotal) || 0) + (Number(tax) || 0)).toFixed(2)}</strong></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice #</TableHead><TableHead>PO</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead>Match</TableHead><TableHead>Due</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {(invoices?.length ?? 0) === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-12"><Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />No vendor invoices yet.</TableCell></TableRow>
              ) : invoices!.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs">{v.vinv_number}</TableCell>
                  <TableCell className="font-mono text-xs">{v.purchase_orders?.po_number ?? "—"}</TableCell>
                  <TableCell>{v.suppliers?.name}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded bg-muted">{v.status}</span></TableCell>
                  <TableCell><span className={`text-xs px-2 py-0.5 rounded ${v.match_status === "matched" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>{v.match_status}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{v.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right">₹{Number(v.grand_total).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right font-medium">₹{Number(v.amount_due).toLocaleString("en-IN")}</TableCell>
                  <TableCell>{Number(v.amount_due) > 0 && canEdit && <Button size="sm" variant="ghost" onClick={() => { setPayOpen(v.id); setPayAmount(String(v.amount_due)); }}><Wallet className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div><Label>Amount</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setPayOpen(null)}>Cancel</Button><Button onClick={pay}>Pay</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}