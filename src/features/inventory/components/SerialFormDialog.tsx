import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItems, useWarehouses } from "@/features/inventory/api";
import { useUpsertSerial, useInvCustomers, type SerialRow } from "@/features/inventory/inventory-api";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; initial?: SerialRow | null; }
const STATUSES = ["in_stock", "reserved", "issued", "quarantine"];

export function SerialFormDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertSerial();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const { data: customers = [] } = useInvCustomers();
  const [form, setForm] = useState({
    item_id: "", warehouse_id: "", serial_no: "", batch_no: "", status: "in_stock",
    received_on: new Date().toISOString().slice(0, 10), warranty_end: "", customer_id: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm(initial ? {
      item_id: initial.item_id, warehouse_id: initial.warehouse_id ?? "", serial_no: initial.serial_no,
      batch_no: initial.batch_no ?? "", status: initial.status,
      received_on: initial.received_on ?? "", warranty_end: initial.warranty_end ?? "",
      customer_id: initial.customer_id ?? "",
    } : {
      item_id: "", warehouse_id: "", serial_no: "", batch_no: "", status: "in_stock",
      received_on: new Date().toISOString().slice(0, 10), warranty_end: "", customer_id: "",
    });
  }, [open, initial]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={initial ? "Edit Serial" : "New Serial"}
      description="Track a serialised unit with warranty and customer allocation."
      submitLabel={initial ? "Save" : "Create"}
      submitting={upsert.isPending}
      onSubmit={async () => {
        await upsert.mutateAsync({
          id: initial?.id, ...form,
          received_on: form.received_on || null,
          warranty_end: form.warranty_end || null,
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Serial # *"><Input value={form.serial_no} onChange={(e) => setForm({ ...form, serial_no: e.target.value })} required /></Field>
        <Field label="Batch #"><Input value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} /></Field>
      </div>
      <Field label="Item *">
        <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
          <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Warehouse">
          <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Received On"><Input type="date" value={form.received_on} onChange={(e) => setForm({ ...form, received_on: e.target.value })} /></Field>
        <Field label="Warranty End"><Input type="date" value={form.warranty_end} onChange={(e) => setForm({ ...form, warranty_end: e.target.value })} /></Field>
      </div>
      <Field label="Customer">
        <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Unallocated" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unallocated</SelectItem>
            {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
    </FormDialog>
  );
}
