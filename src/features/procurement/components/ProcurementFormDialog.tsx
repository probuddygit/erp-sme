import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useSuppliers, useItemsMaster, useWarehouses, usePurchaseOrders } from "@/features/procurement/api";
import { AttachmentsPanel } from "@/features/attachments/components/AttachmentsPanel";
import type { EntityType } from "@/features/attachments/api";
import { computeTotals, inr, type TaxType } from "@/lib/sales-utils";

export interface FormLine {
  item_name: string;
  item_code?: string;
  unit?: string;
  quantity: number;
  unit_price?: number;
  tax_percent?: number;
  notes?: string;
  batch_no?: string;
  item_id?: string | null;
}

export interface ProcurementFormValue {
  id?: string;
  supplier_id?: string;
  po_id?: string | null;
  warehouse_id?: string;
  primary_date: string;
  secondary_date?: string | null;
  status: string;
  tax_type?: TaxType;
  reference?: string;
  reason?: string;
  notes?: string;
  freight?: number;
  lines: FormLine[];
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  primaryDateLabel: string;
  secondaryDateLabel?: string;
  statuses: { value: string; label: string }[];
  showSupplier?: boolean;
  showWarehouse?: boolean;
  showPurchaseOrder?: boolean;
  showTaxType?: boolean;
  showPricing?: boolean;
  showFreight?: boolean;
  showReason?: boolean;
  attachmentsType?: EntityType;
  initial?: ProcurementFormValue | null;
  onSubmit: (v: ProcurementFormValue) => Promise<string | void>;
}

const today = () => new Date().toISOString().slice(0, 10);

function emptyLine(showPricing?: boolean): FormLine {
  return {
    item_name: "",
    quantity: 1,
    unit_price: showPricing ? 0 : undefined,
    tax_percent: showPricing ? 18 : undefined,
  };
}

export function ProcurementFormDialog({
  open, onOpenChange, title, primaryDateLabel, secondaryDateLabel, statuses,
  showSupplier = true, showWarehouse, showPurchaseOrder, showTaxType, showPricing, showFreight, showReason,
  attachmentsType, initial, onSubmit,
}: Props) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: items = [] } = useItemsMaster();
  const { data: warehouses = [] } = useWarehouses();
  const { data: pos = [] } = usePurchaseOrders();
  const [value, setValue] = useState<ProcurementFormValue>(() => initial ?? {
    primary_date: today(), status: statuses[0]?.value ?? "draft",
    tax_type: "intra_state", lines: [emptyLine(showPricing)],
  });
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(initial?.id);

  useEffect(() => {
    if (open) {
      setValue(initial ?? {
        primary_date: today(), status: statuses[0]?.value ?? "draft",
        tax_type: "intra_state", lines: [emptyLine(showPricing)],
      });
      setSavedId(initial?.id);
    }
  }, [open, initial, statuses, showPricing]);

  const totals = showPricing
    ? computeTotals(value.lines.map(l => ({ quantity: l.quantity, unit_price: l.unit_price ?? 0, discount_percent: 0, tax_percent: l.tax_percent ?? 0 })), value.tax_type ?? "intra_state")
    : null;

  const canSave = (!showSupplier || value.supplier_id) && value.lines.length > 0 && value.lines.every(l => l.item_name.trim() && l.quantity > 0);

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const returnedId = await onSubmit(value);
      if (typeof returnedId === "string") setSavedId(returnedId);
      if (!attachmentsType) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const updateLine = (i: number, patch: Partial<FormLine>) => {
    const next = value.lines.slice();
    next[i] = { ...next[i], ...patch };
    setValue({ ...value, lines: next });
  };
  const addLine = () => setValue({ ...value, lines: [...value.lines, emptyLine(showPricing)] });
  const removeLine = (i: number) => setValue({ ...value, lines: value.lines.filter((_, idx) => idx !== i) });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Fill the header, add line items{attachmentsType ? ", and attach any supporting files" : ""}.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {showSupplier && (
            <Field label="Supplier">
              <Select value={value.supplier_id ?? ""} onValueChange={(v) => setValue({ ...value, supplier_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          {showPurchaseOrder && (
            <Field label="Purchase order">
              <Select
                value={value.po_id ?? ""}
                onValueChange={(v) => {
                  const po = (pos as any[]).find((p) => p.id === v);
                  if (!po) { setValue({ ...value, po_id: v }); return; }
                  const poLines: FormLine[] = (po.items ?? []).map((it: any) => ({
                    item_id: it.item_id ?? null,
                    item_name: it.item_name ?? "",
                    item_code: it.item_code ?? undefined,
                    unit: it.unit ?? "Nos",
                    quantity: Math.max(Number(it.quantity ?? 0) - Number(it.received_quantity ?? 0), 0) || Number(it.quantity ?? 1),
                    unit_price: Number(it.unit_price ?? 0),
                    tax_percent: Number(it.tax_percent ?? 0),
                  }));
                  setValue({
                    ...value,
                    po_id: v,
                    supplier_id: po.supplier_id ?? value.supplier_id,
                    lines: poLines.length ? poLines : value.lines,
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Link to purchase order (optional)" /></SelectTrigger>
                <SelectContent>
                  {(pos as any[])
                    .filter((p) => !value.supplier_id || p.supplier_id === value.supplier_id)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.po_number}{p.supplier?.name ? ` · ${p.supplier.name}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Status">
            <Select value={value.status} onValueChange={(v) => setValue({ ...value, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={primaryDateLabel}>
            <Input type="date" value={value.primary_date} onChange={(e) => setValue({ ...value, primary_date: e.target.value })} />
          </Field>
          {secondaryDateLabel && (
            <Field label={secondaryDateLabel}>
              <Input type="date" value={value.secondary_date ?? ""} onChange={(e) => setValue({ ...value, secondary_date: e.target.value || null })} />
            </Field>
          )}
          {showWarehouse && (
            <Field label="Warehouse">
              <Select value={value.warehouse_id ?? ""} onValueChange={(v) => setValue({ ...value, warehouse_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          {showTaxType && showPricing && (
            <Field label="Tax type">
              <Select value={value.tax_type ?? "intra_state"} onValueChange={(v) => setValue({ ...value, tax_type: v as TaxType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="intra_state">Intra-state (CGST+SGST)</SelectItem>
                  <SelectItem value="inter_state">Inter-state (IGST)</SelectItem>
                  <SelectItem value="exempt">Exempt</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          {showFreight && (
            <Field label="Freight / other charges">
              <Input type="number" min={0} step="0.01" value={value.freight ?? 0} onChange={(e) => setValue({ ...value, freight: Number(e.target.value) })} />
            </Field>
          )}
          {showReason && (
            <Field label="Reason">
              <Input value={value.reason ?? ""} onChange={(e) => setValue({ ...value, reason: e.target.value })} />
            </Field>
          )}
        </div>

        <div className="space-y-2 mt-4">
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">Line items</Label>
          <div className="rounded-md border border-border overflow-hidden">
            <div className={`bg-muted/40 px-3 py-2 grid gap-2 text-[11px] uppercase tracking-widest text-muted-foreground ${showPricing ? "grid-cols-12" : "grid-cols-8"}`}>
              <div className={showPricing ? "col-span-4" : "col-span-5"}>Item</div>
              <div className="col-span-1 text-right">Qty</div>
              <div className="col-span-1">Unit</div>
              {showPricing && <>
                <div className="col-span-2 text-right">Rate ₹</div>
                <div className="col-span-1 text-right">GST%</div>
                <div className="col-span-2 text-right">Total</div>
              </>}
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-border">
              {value.lines.map((l, i) => {
                const lineTotal = (l.quantity ?? 0) * (l.unit_price ?? 0) * (1 + (l.tax_percent ?? 0) / 100);
                return (
                  <div key={i} className={`px-3 py-2 grid gap-2 items-center ${showPricing ? "grid-cols-12" : "grid-cols-8"}`}>
                    <Input list={`items-${i}`} className={`h-8 ${showPricing ? "col-span-4" : "col-span-5"}`} placeholder="Item name / SKU" value={l.item_name} onChange={(e) => {
                      const name = e.target.value;
                      const match = items.find((it: any) => it.name === name || it.sku === name);
                      updateLine(i, match
                        ? { item_name: match.name, item_id: match.id, item_code: match.sku ?? undefined, unit: l.unit || match.unit || "Nos" }
                        : { item_name: name, item_id: null });
                    }} />
                    <datalist id={`items-${i}`}>
                      {items.map((it: any) => <option key={it.id} value={it.name}>{it.sku ? `${it.sku} — ${it.name}` : it.name}</option>)}
                    </datalist>
                    <Input className="col-span-1 h-8 text-right" type="number" min={0} step="0.01" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                    <Input className="col-span-1 h-8" placeholder="Nos" value={l.unit ?? ""} onChange={(e) => updateLine(i, { unit: e.target.value })} />
                    {showPricing && <>
                      <Input className="col-span-2 h-8 text-right" type="number" min={0} step="0.01" value={l.unit_price ?? 0} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} />
                      <Input className="col-span-1 h-8 text-right" type="number" min={0} max={100} step="0.01" value={l.tax_percent ?? 0} onChange={(e) => updateLine(i, { tax_percent: Number(e.target.value) })} />
                      <div className="col-span-2 text-right tabular-nums font-medium">{inr(lineTotal)}</div>
                    </>}
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {value.lines.length === 0 && <div className="px-3 py-6 text-center text-sm text-muted-foreground">No items yet</div>}
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add line
          </Button>
          {totals && (
            <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1 text-sm max-w-sm ml-auto">
              <Row label="Subtotal" value={inr(totals.subtotal)} />
              <Row label="Taxes" value={inr(totals.tax_total)} />
              {showFreight && (value.freight ?? 0) > 0 && <Row label="Freight" value={inr(value.freight ?? 0)} />}
              <div className="border-t border-border pt-2 mt-2">
                <Row label="Grand total" value={inr(totals.grand_total + (showFreight ? (value.freight ?? 0) : 0))} bold />
              </div>
            </div>
          )}
        </div>

        <Field label="Notes">
          <Textarea value={value.notes ?? ""} onChange={(e) => setValue({ ...value, notes: e.target.value })} rows={2} />
        </Field>

        {attachmentsType && savedId && (
          <div className="mt-4 rounded-lg border border-border bg-card p-3">
            <AttachmentsPanel entityType={attachmentsType} entityId={savedId} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{savedId && attachmentsType ? "Close" : "Cancel"}</Button>
          <Button onClick={submit} disabled={!canSave || saving}>{saving ? "Saving…" : savedId ? "Save changes" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-bold tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}