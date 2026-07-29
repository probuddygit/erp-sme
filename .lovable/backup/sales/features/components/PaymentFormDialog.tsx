import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInvoices, type PaymentInput } from "@/features/sales/api";
import type { Database } from "@/integrations/supabase/types";

type Method = Database["public"]["Enums"]["payment_method"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: PaymentInput | null;
  onSubmit: (v: PaymentInput) => Promise<void>;
}

function today() { return new Date().toISOString().slice(0, 10); }

export function PaymentFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { data: invoices = [] } = useInvoices();
  const [value, setValue] = useState<PaymentInput>(() => initial ?? {
    invoice_id: "", payment_date: today(), amount: 0, method: "bank_transfer" as Method, reference: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(initial ?? {
      invoice_id: "", payment_date: today(), amount: 0, method: "bank_transfer" as Method, reference: "", notes: "",
    });
  }, [open, initial]);

  const canSave = value.invoice_id && value.amount > 0;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try { await onSubmit(value); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Payment" : "Record Payment"}</DialogTitle>
          <DialogDescription>Receipt against a customer invoice.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <F label="Invoice">
            <Select value={value.invoice_id} onValueChange={(v) => setValue({ ...value, invoice_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
              <SelectContent>
                {invoices.map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.invoice_number} · {i.customer?.name ?? ""} · Due ₹{Number(i.amount_due ?? 0).toLocaleString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <div className="grid grid-cols-2 gap-3">
            <F label="Date"><Input type="date" value={value.payment_date} onChange={(e) => setValue({ ...value, payment_date: e.target.value })} /></F>
            <F label="Amount"><Input type="number" min={0} step="0.01" value={value.amount} onChange={(e) => setValue({ ...value, amount: Number(e.target.value) })} /></F>
            <F label="Method">
              <Select value={value.method} onValueChange={(v) => setValue({ ...value, method: v as Method })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash","bank_transfer","cheque","upi","card","other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Reference"><Input value={value.reference ?? ""} onChange={(e) => setValue({ ...value, reference: e.target.value })} /></F>
          </div>
          <F label="Notes"><Textarea rows={2} value={value.notes ?? ""} onChange={(e) => setValue({ ...value, notes: e.target.value })} /></F>
        </div>
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