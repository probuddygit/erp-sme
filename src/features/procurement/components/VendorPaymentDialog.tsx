import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSuppliers, useVendorInvoices, type VPayInput } from "@/features/procurement/api";

const METHODS = ["cash", "bank_transfer", "cheque", "upi", "card"];
const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: (VPayInput & { id?: string }) | null;
  onSubmit: (v: VPayInput) => Promise<void>;
}

export function VendorPaymentDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: invoices = [] } = useVendorInvoices();
  const [v, setV] = useState<VPayInput>(() => initial ?? {
    supplier_id: "", payment_date: today(), amount: 0, method: "bank_transfer",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setV(initial ?? { supplier_id: "", payment_date: today(), amount: 0, method: "bank_transfer" });
  }, [open, initial]);

  const filteredInv = (invoices as any[]).filter(i => !v.supplier_id || i.supplier_id === v.supplier_id);
  const canSave = v.supplier_id && v.amount > 0 && v.method;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit payment" : "New vendor payment"}</DialogTitle>
          <DialogDescription>Record a payment made to a supplier.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Supplier">
            <Select value={v.supplier_id} onValueChange={(x) => setV({ ...v, supplier_id: x, vinv_id: null })}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Against invoice (optional)">
            <Select value={v.vinv_id ?? "__none"} onValueChange={(x) => setV({ ...v, vinv_id: x === "__none" ? null : x })}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {filteredInv.map(i => <SelectItem key={i.id} value={i.id}>{i.vinv_number} · ₹{Number(i.grand_total).toLocaleString("en-IN")}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment date">
              <Input type="date" value={v.payment_date} onChange={(e) => setV({ ...v, payment_date: e.target.value })} />
            </Field>
            <Field label="Amount ₹">
              <Input type="number" min={0} step="0.01" value={v.amount} onChange={(e) => setV({ ...v, amount: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Method">
              <Select value={v.method} onValueChange={(x) => setV({ ...v, method: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reference">
              <Input value={v.reference ?? ""} onChange={(e) => setV({ ...v, reference: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes"><Textarea rows={2} value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button disabled={!canSave || saving} onClick={async () => { setSaving(true); try { await onSubmit(v); onOpenChange(false); } finally { setSaving(false); } }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>{children}</div>;
}