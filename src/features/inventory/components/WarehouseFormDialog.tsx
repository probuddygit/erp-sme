import { useEffect, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertWarehouse, type WarehouseInput } from "@/features/inventory/api";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["warehouses"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Row | null;
}

export function WarehouseFormDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertWarehouse();
  const [form, setForm] = useState<WarehouseInput>({ code: "", name: "", address: "", is_active: true });

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        id: initial.id, code: initial.code, name: initial.name,
        address: initial.address ?? "", is_active: initial.is_active,
      } : { code: "", name: "", address: "", is_active: true });
    }
  }, [open, initial]);

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={initial ? "Edit Warehouse" : "New Warehouse"}
      submitLabel={initial ? "Save" : "Create"}
      submitting={upsert.isPending}
      onSubmit={async () => { await upsert.mutateAsync(form); }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field>
        <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
      </div>
      <Field label="Address"><Textarea rows={3} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
    </FormDialog>
  );
}