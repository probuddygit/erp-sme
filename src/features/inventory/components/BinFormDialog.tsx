import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWarehouses } from "@/features/inventory/api";
import { useUpsertBin, type BinRow } from "@/features/inventory/inventory-api";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; initial?: BinRow | null; }

export function BinFormDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertBin();
  const { data: warehouses = [] } = useWarehouses();
  const [form, setForm] = useState({ warehouse_id: "", code: "", zone: "", rack: "", shelf: "", capacity: 0, used: 0, is_active: true });

  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      warehouse_id: initial.warehouse_id, code: initial.code, zone: initial.zone ?? "", rack: initial.rack ?? "",
      shelf: initial.shelf ?? "", capacity: Number(initial.capacity), used: Number(initial.used), is_active: initial.is_active,
    } : { warehouse_id: warehouses[0]?.id ?? "", code: "", zone: "", rack: "", shelf: "", capacity: 0, used: 0, is_active: true });
  }, [open, initial, warehouses]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={initial ? "Edit Bin" : "New Bin"}
      description="Bin-level storage location inside a warehouse."
      submitLabel={initial ? "Save" : "Create"}
      submitting={upsert.isPending}
      onSubmit={async () => { await upsert.mutateAsync({ id: initial?.id, ...form }); }}
    >
      <Field label="Warehouse *">
        <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
          <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bin Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field>
        <Field label="Zone"><Input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rack"><Input value={form.rack} onChange={(e) => setForm({ ...form, rack: e.target.value })} /></Field>
        <Field label="Shelf"><Input value={form.shelf} onChange={(e) => setForm({ ...form, shelf: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
        <Field label="Used"><Input type="number" value={form.used} onChange={(e) => setForm({ ...form, used: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Status">
        <Select value={form.is_active ? "active" : "inactive"} onValueChange={(v) => setForm({ ...form, is_active: v === "active" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </Field>
    </FormDialog>
  );
}
