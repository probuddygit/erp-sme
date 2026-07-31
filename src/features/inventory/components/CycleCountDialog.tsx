import { useEffect, useMemo, useState } from "react";
import { FormDialog, Field } from "@/features/crm/components/FormDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useItems, useWarehouses, useStockLevels } from "@/features/inventory/api";
import { useUpsertCycleCount, type CycleCountWithLines } from "@/features/inventory/inventory-api";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; initial?: CycleCountWithLines | null; }

interface Line { item_id: string; system_qty: number; counted_qty: number; unit_cost: number }

export function CycleCountDialog({ open, onOpenChange, initial }: Props) {
  const upsert = useUpsertCycleCount();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const { data: levels = [] } = useStockLevels();
  const [form, setForm] = useState({
    warehouse_id: "", count_number: "", zone: "", scheduled_date: new Date().toISOString().slice(0, 10), notes: "",
  });
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        warehouse_id: initial.warehouse_id, count_number: initial.count_number, zone: initial.zone ?? "",
        scheduled_date: initial.scheduled_date, notes: initial.notes ?? "",
      });
      setLines(initial.lines.map((l) => ({
        item_id: l.item_id, system_qty: Number(l.system_qty), counted_qty: Number(l.counted_qty), unit_cost: Number(l.unit_cost),
      })));
    } else {
      setForm({
        warehouse_id: warehouses[0]?.id ?? "", count_number: `CC-${Date.now().toString().slice(-6)}`,
        zone: "", scheduled_date: new Date().toISOString().slice(0, 10), notes: "",
      });
      setLines([]);
    }
  }, [open, initial, warehouses]);

  const systemQty = useMemo(() => {
    const m = new Map<string, number>();
    levels.forEach((l) => {
      if (form.warehouse_id && l.warehouse_id !== form.warehouse_id) return;
      m.set(l.item_id, (m.get(l.item_id) ?? 0) + Number(l.on_hand));
    });
    return m;
  }, [levels, form.warehouse_id]);

  const setLine = (idx: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  return (
    <FormDialog
      open={open} onOpenChange={onOpenChange}
      title={initial ? "Edit Cycle Count" : "New Cycle Count"}
      description="Capture physical counts; posting creates stock adjustments for every variance."
      submitLabel={initial ? "Save" : "Create"}
      submitting={upsert.isPending}
      onSubmit={async () => { await upsert.mutateAsync({ id: initial?.id, ...form, lines }); }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Count # *"><Input value={form.count_number} onChange={(e) => setForm({ ...form, count_number: e.target.value })} required /></Field>
        <Field label="Scheduled *"><Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Warehouse *">
          <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Zone"><Input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} /></Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Count lines</span>
          <Button type="button" size="sm" variant="outline"
            onClick={() => setLines((ls) => [...ls, { item_id: "", system_qty: 0, counted_qty: 0, unit_cost: 0 }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add line
          </Button>
        </div>
        {lines.length === 0 && <p className="text-xs text-muted-foreground">No lines yet.</p>}
        {lines.map((l, idx) => {
          const diff = Number(l.counted_qty) - Number(l.system_qty);
          return (
            <div key={idx} className="grid grid-cols-12 items-end gap-2 rounded-md border p-2">
              <div className="col-span-5">
                <Select value={l.item_id} onValueChange={(v) => {
                  const it = items.find((i) => i.id === v);
                  setLine(idx, { item_id: v, system_qty: systemQty.get(v) ?? 0, unit_cost: Number(it?.standard_cost ?? 0) });
                }}>
                  <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                  <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Input type="number" value={l.system_qty} onChange={(e) => setLine(idx, { system_qty: Number(e.target.value) })} placeholder="System" />
              </div>
              <div className="col-span-2">
                <Input type="number" value={l.counted_qty} onChange={(e) => setLine(idx, { counted_qty: Number(e.target.value) })} placeholder="Counted" />
              </div>
              <div className={`col-span-2 text-right text-sm font-medium ${diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {diff > 0 ? `+${diff}` : diff}
              </div>
              <div className="col-span-1 text-right">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                  onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
    </FormDialog>
  );
}
