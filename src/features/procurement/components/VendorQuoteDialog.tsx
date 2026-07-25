import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useSuppliers, useRFQs, type VendorQuoteInput } from "@/features/procurement/api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: (VendorQuoteInput & { id?: string }) | null;
  onSubmit: (v: VendorQuoteInput) => Promise<void>;
}

export function VendorQuoteDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: rfqs = [] } = useRFQs();
  const [v, setV] = useState<VendorQuoteInput>(() => initial ?? {
    rfq_id: "", rfq_item_id: "", supplier_id: "", unit_price: 0, is_selected: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setV(initial ?? { rfq_id: "", rfq_item_id: "", supplier_id: "", unit_price: 0, is_selected: false });
  }, [open, initial]);

  const rfq = (rfqs as any[]).find(r => r.id === v.rfq_id);
  const rfqItems: any[] = rfq?.items ?? [];

  const canSave = v.rfq_id && v.rfq_item_id && v.supplier_id && v.unit_price >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit vendor quote" : "New vendor quote"}</DialogTitle>
          <DialogDescription>Record a supplier's quoted price against an RFQ line.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="RFQ">
            <Select value={v.rfq_id} onValueChange={(x) => setV({ ...v, rfq_id: x, rfq_item_id: "" })}>
              <SelectTrigger><SelectValue placeholder="Select RFQ" /></SelectTrigger>
              <SelectContent>
                {(rfqs as any[]).map(r => <SelectItem key={r.id} value={r.id}>{r.rfq_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="RFQ line">
            <Select value={v.rfq_item_id} onValueChange={(x) => setV({ ...v, rfq_item_id: x })} disabled={!v.rfq_id}>
              <SelectTrigger><SelectValue placeholder="Select line" /></SelectTrigger>
              <SelectContent>
                {rfqItems.map(it => <SelectItem key={it.id} value={it.id}>{it.item_name} · {it.quantity} {it.unit ?? ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Supplier">
            <Select value={v.supplier_id} onValueChange={(x) => setV({ ...v, supplier_id: x })}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit price ₹">
              <Input type="number" min={0} step="0.01" value={v.unit_price} onChange={(e) => setV({ ...v, unit_price: Number(e.target.value) })} />
            </Field>
            <Field label="Lead time (days)">
              <Input type="number" min={0} value={v.lead_time_days ?? ""} onChange={(e) => setV({ ...v, lead_time_days: e.target.value ? Number(e.target.value) : null })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!v.is_selected} onCheckedChange={(c) => setV({ ...v, is_selected: !!c })} />
            Mark as selected quote
          </label>
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