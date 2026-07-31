import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItems, useWarehouses } from "@/features/inventory/api";
import { usePostOpeningStock } from "@/features/inventory/inventory-api";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

export function OpeningStockDialog({ open, onOpenChange }: Props) {
  const post = usePostOpeningStock();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const [form, setForm] = useState({ item_id: "", warehouse_id: "", quantity: 0, unit_cost: 0 });

  useEffect(() => { if (open) setForm({ item_id: "", warehouse_id: "", quantity: 0, unit_cost: 0 }); }, [open]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title="Post Opening Stock"
      description="Creates an opening stock batch and ledger entry for the selected item."
      submitLabel="Post"
      submitting={post.isPending}
      onSubmit={async () => { await post.mutateAsync(form); }}
    >
      <Field label="Item *">
        <Select value={form.item_id} onValueChange={(v) => {
          const it = items.find((i) => i.id === v);
          setForm((f) => ({ ...f, item_id: v, unit_cost: f.unit_cost || Number(it?.standard_cost ?? 0) }));
        }}>
          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
          <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Warehouse *">
        <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
          <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity *"><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required /></Field>
        <Field label="Rate (₹)"><Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })} /></Field>
      </div>
    </FormDialog>
  );
}
