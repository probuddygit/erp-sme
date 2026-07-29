import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useCustomers, useItemsMaster, type DeliveryInput, type DeliveryLine } from "@/features/sales/api";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["delivery_note_status"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: DeliveryInput | null;
  onSubmit: (v: DeliveryInput) => Promise<void>;
}

function today() { return new Date().toISOString().slice(0, 10); }

export function DeliveryFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const { data: customers = [] } = useCustomers();
  const { data: items = [] } = useItemsMaster();
  const [value, setValue] = useState<DeliveryInput>(() => initial ?? {
    customer_id: "", delivery_date: today(), status: "draft" as Status,
    vehicle_no: "", driver_name: "", driver_phone: "", notes: "",
    lines: [{ item_id: "", qty: 1 }],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(initial ?? {
      customer_id: "", delivery_date: today(), status: "draft" as Status,
      vehicle_no: "", driver_name: "", driver_phone: "", notes: "",
      lines: [{ item_id: "", qty: 1 }],
    });
  }, [open, initial]);

  const setLine = (i: number, patch: Partial<DeliveryLine>) => {
    const lines = value.lines.slice();
    lines[i] = { ...lines[i], ...patch };
    setValue({ ...value, lines });
  };

  const canSave = value.customer_id && value.lines.some((l) => l.item_id && l.qty > 0);

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try { await onSubmit(value); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Delivery Note" : "New Delivery Note"}</DialogTitle>
          <DialogDescription>Dispatch details with items and quantities.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Customer">
            <Select value={value.customer_id} onValueChange={(v) => setValue({ ...value, customer_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Status">
            <Select value={value.status} onValueChange={(v) => setValue({ ...value, status: v as Status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["draft","dispatched","delivered","cancelled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </F>
          <F label="Delivery date"><Input type="date" value={value.delivery_date} onChange={(e) => setValue({ ...value, delivery_date: e.target.value })} /></F>
          <F label="Vehicle no"><Input value={value.vehicle_no ?? ""} onChange={(e) => setValue({ ...value, vehicle_no: e.target.value })} /></F>
          <F label="Driver name"><Input value={value.driver_name ?? ""} onChange={(e) => setValue({ ...value, driver_name: e.target.value })} /></F>
          <F label="Driver phone"><Input value={value.driver_phone ?? ""} onChange={(e) => setValue({ ...value, driver_phone: e.target.value })} /></F>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Items</Label>
          <div className="rounded-md border border-border divide-y">
            {value.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                <div className="col-span-6">
                  <Select value={l.item_id} onValueChange={(v) => setLine(i, { item_id: v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} ({it.sku})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input className="col-span-2 h-8 text-right" type="number" min={0} step="0.01" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
                <Input className="col-span-2 h-8" placeholder="UOM" value={l.uom ?? ""} onChange={(e) => setLine(i, { uom: e.target.value })} />
                <Input className="col-span-1 h-8" placeholder="Note" value={l.notes ?? ""} onChange={(e) => setLine(i, { notes: e.target.value })} />
                <Button size="icon" variant="ghost" className="col-span-1 h-7 w-7 justify-self-end" onClick={() => setValue({ ...value, lines: value.lines.filter((_, x) => x !== i) })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setValue({ ...value, lines: [...value.lines, { item_id: "", qty: 1 }] })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add item
          </Button>
        </div>

        <F label="Notes"><Textarea rows={2} value={value.notes ?? ""} onChange={(e) => setValue({ ...value, notes: e.target.value })} /></F>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={!canSave || saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>{children}</div>;
}