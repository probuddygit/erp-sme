import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePostAdjustment, useItems, useWarehouses } from "@/features/inventory/api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const REASONS = ["Damage", "Cycle Count Variance", "Shrinkage", "Wrong Receipt", "System Error", "Sample Issue"];

export function AdjustmentDialog({ open, onOpenChange }: Props) {
  const post = usePostAdjustment();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const [form, setForm] = useState({ item_id: "", warehouse_id: "", variance: 0, unit_cost: 0, reason: REASONS[0] });

  useEffect(() => {
    if (open) setForm({ item_id: "", warehouse_id: "", variance: 0, unit_cost: 0, reason: REASONS[0] });
  }, [open]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title="New Stock Adjustment"
      description="Post a variance to increase or decrease on-hand stock."
      submitLabel="Post"
      submitting={post.isPending}
      onSubmit={async () => { await post.mutateAsync(form); }}
    >
      <Field label="Item *">
        <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
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
        <Field label="Variance (+/-)"><Input type="number" value={form.variance} onChange={(e) => setForm({ ...form, variance: Number(e.target.value) })} /></Field>
        <Field label="Unit Cost (for +)"><Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Reason">
        <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
    </FormDialog>
  );
}