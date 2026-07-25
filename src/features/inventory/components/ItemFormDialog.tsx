import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertItem, type ItemInput } from "@/features/inventory/api";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["items"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Row | null;
}

const ITEM_TYPES: ItemInput["item_type"][] = ["raw_material", "wip", "finished_good", "consumable", "service"];

export function ItemFormDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertItem();
  const [form, setForm] = useState<ItemInput>({
    sku: "", name: "", item_type: "raw_material", unit: "NOS",
    hsn_code: "", standard_cost: 0, min_stock: 0, reorder_level: 0, reorder_qty: 0,
    valuation_method: "fifo", is_active: true,
  });

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        id: initial.id,
        sku: initial.sku, name: initial.name,
        description: initial.description,
        item_type: initial.item_type,
        unit: initial.unit,
        hsn_code: initial.hsn_code ?? "",
        min_stock: initial.min_stock ?? 0,
        reorder_level: initial.reorder_level ?? 0,
        reorder_qty: initial.reorder_qty ?? 0,
        standard_cost: initial.standard_cost ?? 0,
        valuation_method: initial.valuation_method ?? "fifo",
        is_active: initial.is_active,
      } : {
        sku: "", name: "", item_type: "raw_material", unit: "NOS",
        hsn_code: "", standard_cost: 0, min_stock: 0, reorder_level: 0, reorder_qty: 0,
        valuation_method: "fifo", is_active: true,
      });
    }
  }, [open, initial]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={initial ? "Edit Item" : "New Item"}
      submitLabel={initial ? "Save" : "Create"}
      submitting={upsert.isPending}
      onSubmit={async () => { await upsert.mutateAsync(form); }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU *"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></Field>
        <Field label="Unit *"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required /></Field>
      </div>
      <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v as ItemInput["item_type"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ITEM_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="HSN Code"><Input value={form.hsn_code ?? ""} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Standard Cost"><Input type="number" value={form.standard_cost ?? 0} onChange={(e) => setForm({ ...form, standard_cost: Number(e.target.value) })} /></Field>
        <Field label="Min Stock"><Input type="number" value={form.min_stock ?? 0} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} /></Field>
        <Field label="Reorder Level"><Input type="number" value={form.reorder_level ?? 0} onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Reorder Qty"><Input type="number" value={form.reorder_qty ?? 0} onChange={(e) => setForm({ ...form, reorder_qty: Number(e.target.value) })} /></Field>
        <Field label="Valuation">
          <Select value={form.valuation_method} onValueChange={(v) => setForm({ ...form, valuation_method: v as ItemInput["valuation_method"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fifo">FIFO</SelectItem>
              <SelectItem value="weighted_average">Weighted Average</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </FormDialog>
  );
}