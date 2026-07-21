import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Repeat } from "lucide-react";
import { toast } from "sonner";
import { RowActions } from "@/components/RowActions";

export const Route = createFileRoute("/_authenticated/app/sales/recurring")({
  component: RecurringPage,
});

type Row = { id: string; name: string; frequency: string; next_run_date: string; last_run_date: string | null; active: boolean; template: { amount?: number; notes?: string }; customer: { name: string } | null };

function RecurringPage() {
  const { company, hasRole, isCompanyAdmin } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const canEdit = isCompanyAdmin || hasRole("sales") || hasRole("finance");

  const { data, isLoading } = useQuery({
    enabled: !!company?.id,
    queryKey: ["rec_invoices", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_invoice_templates" as never)
        .select("*, customer:customers(name)")
        .eq("company_id", company!.id)
        .order("next_run_date", { ascending: true });
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("recurring_invoice_templates" as never).update({ active } as never).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["rec_invoices", company?.id] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold">Recurring Invoices</h2>
          <p className="text-sm text-muted-foreground">Templates that auto-generate invoices on a schedule.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New template</Button></DialogTrigger>
            <RecurringDialog onClose={() => setOpen(false)} onSaved={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["rec_invoices", company?.id] }); }} />
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Active</TableHead>
                {canEdit && <TableHead className="text-right w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={canEdit ? 8 : 7} className="text-center text-muted-foreground py-12">
                  <Repeat className="mx-auto h-8 w-8 mb-2 opacity-50" />No recurring templates yet
                </TableCell></TableRow>
              )}
              {(data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.customer?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{r.frequency}</Badge></TableCell>
                  <TableCell>{r.next_run_date}</TableCell>
                  <TableCell className="text-muted-foreground">{r.last_run_date ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">₹{Number(r.template?.amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell><Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} disabled={!canEdit} /></TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <RowActions table="recurring_invoice_templates" id={r.id} label={`template "${r.name}"`} invalidateKeys={[["rec_invoices", company?.id]]} />
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

function RecurringDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { company, user } = useAuth();
  const [form, setForm] = useState({ name: "", customer_id: "", frequency: "monthly", next_run_date: new Date().toISOString().slice(0, 10), amount: "0", notes: "" });
  const [saving, setSaving] = useState(false);
  const { data: customers } = useQuery({ enabled: !!company?.id, queryKey: ["rec-cust", company?.id], queryFn: async () => (await supabase.from("customers").select("id,name").eq("company_id", company!.id).order("name")).data ?? [] });

  const submit = async () => {
    if (!company?.id) return;
    if (!form.name.trim() || !form.customer_id) { toast.error("Name and customer are required"); return; }
    setSaving(true);
    const { error } = await supabase.from("recurring_invoice_templates" as never).insert({
      company_id: company.id, name: form.name.trim(), customer_id: form.customer_id,
      frequency: form.frequency, next_run_date: form.next_run_date,
      template: { amount: Number(form.amount) || 0, notes: form.notes || null }, created_by: user?.id,
    } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Template created");
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>New recurring template</DialogTitle></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" className="sm:col-span-2"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Monthly AMC - ACME" /></Field>
        <Field label="Customer *"><Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{(customers ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Frequency"><Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["weekly", "monthly", "quarterly", "yearly"].map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Next run date"><Input type="date" value={form.next_run_date} onChange={(e) => setForm({ ...form, next_run_date: e.target.value })} /></Field>
        <Field label="Amount (₹)"><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
        <Field label="Notes" className="sm:col-span-2"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
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