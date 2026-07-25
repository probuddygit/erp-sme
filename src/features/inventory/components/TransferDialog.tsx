import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePostTransfer, useItems, useWarehouses } from "@/features/inventory/api";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function TransferDialog({ open, onOpenChange }: Props) {
  const post = usePostTransfer();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const [form, setForm] = useState({ item_id: "", from_warehouse_id: "", to_warehouse_id: "", quantity: 0, unit_cost: 0, notes: "" });

  useEffect(() => {
    if (open) setForm({ item_id: "", from_warehouse_id: "", to_warehouse_id: "", quantity: 0, unit_cost: 0, notes: "" });
  }, [open]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title="New Stock Transfer"
      description="Move stock from one warehouse to another (posts issue + receipt)."
      submitLabel="Post Transfer"
      submitting={post.isPending}
      onSubmit={async () => { await post.mutateAsync(form); }}
    >
      <Field label="Item *">
        <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
          <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From Warehouse *">
          <Select value={form.from_warehouse_id} onValueChange={(v) => setForm({ ...form, from_warehouse_id: v })}>
            <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="To Warehouse *">
          <Select value={form.to_warehouse_id} onValueChange={(v) => setForm({ ...form, to_warehouse_id: v })}>
            <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity *"><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required /></Field>
        <Field label="Unit Cost"><Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Notes"><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
    </FormDialog>
  );
}