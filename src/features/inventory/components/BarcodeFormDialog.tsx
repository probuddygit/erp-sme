import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItems } from "@/features/inventory/api";
import { useUpsertBarcode, type BarcodeRow } from "@/features/inventory/inventory-api";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; initial?: BarcodeRow | null; }
const FORMATS = ["Code128", "EAN-13", "QR"];

export function BarcodeFormDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertBarcode();
  const { data: items = [] } = useItems();
  const [form, setForm] = useState({ item_id: "", barcode: "", format: "Code128" });

  useEffect(() => {
    if (!open) return;
    setForm(initial
      ? { item_id: initial.item_id, barcode: initial.barcode, format: initial.format }
      : { item_id: "", barcode: "", format: "Code128" });
  }, [open, initial]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={initial ? "Edit Barcode" : "New Barcode"}
      description="Map a barcode / QR value to a stock item."
      submitLabel={initial ? "Save" : "Create"}
      submitting={upsert.isPending}
      onSubmit={async () => { await upsert.mutateAsync({ id: initial?.id, ...form }); }}
    >
      <Field label="Item *">
        <Select value={form.item_id} onValueChange={(v) => {
          const it = items.find((i) => i.id === v);
          setForm((f) => ({ ...f, item_id: v, barcode: f.barcode || `${(it?.sku ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}` }));
        }}>
          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
          <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Barcode *"><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} required /></Field>
      <Field label="Format">
        <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </FormDialog>
  );
}
