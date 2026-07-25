import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LineItemsEditor, emptyLine, type EditableLine } from "@/components/sales/LineItemsEditor";
import { useCustomers } from "@/features/sales/api";
import type { TaxType } from "@/lib/sales-utils";

export interface DocFormValue {
  id?: string;
  customer_id: string;
  primary_date: string;
  secondary_date?: string | null;
  status: string;
  tax_type: TaxType;
  notes?: string;
  lines: EditableLine[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  primaryDateLabel: string;
  secondaryDateLabel?: string;
  statuses: { value: string; label: string }[];
  initial?: DocFormValue | null;
  onSubmit: (v: DocFormValue) => Promise<void>;
}

function today() { return new Date().toISOString().slice(0, 10); }

export function DocumentFormDialog({ open, onOpenChange, title, primaryDateLabel, secondaryDateLabel, statuses, initial, onSubmit }: Props) {
  const { data: customers = [] } = useCustomers();
  const [value, setValue] = useState<DocFormValue>(() => initial ?? {
    customer_id: "",
    primary_date: today(),
    secondary_date: null,
    status: statuses[0]?.value ?? "draft",
    tax_type: "intra_state",
    notes: "",
    lines: [emptyLine()],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initial ?? {
        customer_id: "",
        primary_date: today(),
        secondary_date: null,
        status: statuses[0]?.value ?? "draft",
        tax_type: "intra_state",
        notes: "",
        lines: [emptyLine()],
      });
    }
  }, [open, initial, statuses]);

  const canSave = useMemo(() => value.customer_id && value.lines.length > 0 && value.lines.every((l) => l.product_name.trim()), [value]);

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try { await onSubmit(value); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Fill header details and line items. Tax split follows the selected tax type.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer">
            <Select value={value.customer_id} onValueChange={(v) => setValue({ ...value, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={value.status} onValueChange={(v) => setValue({ ...value, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={primaryDateLabel}>
            <Input type="date" value={value.primary_date} onChange={(e) => setValue({ ...value, primary_date: e.target.value })} />
          </Field>
          {secondaryDateLabel && (
            <Field label={secondaryDateLabel}>
              <Input type="date" value={value.secondary_date ?? ""} onChange={(e) => setValue({ ...value, secondary_date: e.target.value || null })} />
            </Field>
          )}
          <Field label="Tax type">
            <Select value={value.tax_type} onValueChange={(v) => setValue({ ...value, tax_type: v as TaxType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intra_state">Intra-state (CGST+SGST)</SelectItem>
                <SelectItem value="inter_state">Inter-state (IGST)</SelectItem>
                <SelectItem value="exempt">Exempt</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <LineItemsEditor lines={value.lines} setLines={(next) => setValue({ ...value, lines: next })} taxType={value.tax_type} />

        <Field label="Notes">
          <Textarea value={value.notes ?? ""} onChange={(e) => setValue({ ...value, notes: e.target.value })} rows={2} />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={!canSave || saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}