import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useCustomers, useItemsMaster, useInvoices, type ReturnInput, type ReturnLine } from "@/features/sales/api";
import type { Database } from "@/integrations/supabase/types";
import { inr } from "@/lib/sales-utils";

type Status = Database["public"]["Enums"]["sales_return_status"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: ReturnInput | null;
  onSubmit: (v: ReturnInput) => Promise<void>;
}

function today() { return new Date().toISOString().slice(0, 10); }

export function ReturnFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: items = [] } = useItemsMaster();
  const { data: invoices = [] } = useInvoices();
  const [value, setValue] = useState<ReturnInput>(() => initial ?? {
    customer_id: "", invoice_id: null, return_date: today(), status: "draft" as Status,
    reason: "", notes: "", lines: [{ item_id: "", qty: 1, rate: 0, tax_pct: 18 }],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(initial ?? {
      customer_id: "", invoice_id: null, return_date: today(), status: "draft" as Status,
      reason: "", notes: "", lines: [{ item_id: "", qty: 1, rate: 0, tax_pct: 18 }],
    });
  }, [open, initial]);

  const setLine = (i: number, patch: Partial<ReturnLine>) => {
    const lines = value.lines.slice();
    lines[i] = { ...lines[i], ...patch };
    setValue({ ...value, lines });
  };

  const total = value.lines.reduce((s, l) => s + l.qty * l.rate * (1 + l.tax_pct / 100), 0);
  const canSave = value.customer_id && value.lines.some((l) => l.item_id && l.qty > 0);
  const invoiceOptions = invoices.filter((i: any) => !value.customer_id || i.customer_id === value.customer_id);

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try { await onSubmit(value); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Sales Return" : "New Sales Return"}</DialogTitle>
          <DialogDescription>Customer return against an invoice.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Customer">
            <Select value={value.customer_id} onValueChange={(v) => setValue({ ...value, customer_id: v, invoice_id: null })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Against invoice">
            <Select value={value.invoice_id ?? "none"} onValueChange={(v) => setValue({ ...value, invoice_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— none —</SelectItem>
                {invoiceOptions.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Return date"><Input type="date" value={value.return_date} onChange={(e) => setValue({ ...value, return_date: e.target.value })} /></F>
          <F label="Status">
            <Select value={value.status} onValueChange={(v) => setValue({ ...value, status: v as Status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["draft","approved","received","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Reason"><Input value={value.reason ?? ""} onChange={(e) => setValue({ ...value, reason: e.target.value })} /></F>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Items</Label>
          <div className="rounded-md border border-border divide-y">
            {value.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                <div className="col-span-5">
                  <Select value={l.item_id} onValueChange={(v) => setLine(i, { item_id: v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Item" /></SelectTrigger>
                    <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} ({it.sku})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input className="col-span-2 h-8 text-right" type="number" min={0} step="0.01" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
                <Input className="col-span-2 h-8 text-right" type="number" min={0} step="0.01" value={l.rate} onChange={(e) => setLine(i, { rate: Number(e.target.value) })} />
                <Input className="col-span-2 h-8 text-right" type="number" min={0} step="0.01" value={l.tax_pct} onChange={(e) => setLine(i, { tax_pct: Number(e.target.value) })} />
                <Button size="icon" variant="ghost" className="col-span-1 h-7 w-7 justify-self-end" onClick={() => setValue({ ...value, lines: value.lines.filter((_, x) => x !== i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button size="sm" variant="outline" onClick={() => setValue({ ...value, lines: [...value.lines, { item_id: "", qty: 1, rate: 0, tax_pct: 18 }] })}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add
            </Button>
            <div className="text-sm font-medium">Total: <span className="tabular-nums">{inr(total)}</span></div>
          </div>
        </div>

        <F label="Notes"><Textarea rows={2} value={value.notes ?? ""} onChange={(e) => setValue({ ...value, notes: e.target.value })} /></F>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={!canSave || saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>{children}</div>;
}