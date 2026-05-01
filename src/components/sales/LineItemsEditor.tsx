import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { computeLine, computeTotals, inr, type LineInput } from "@/lib/sales-utils";
import type { Database } from "@/integrations/supabase/types";

type TaxType = Database["public"]["Enums"]["tax_type"];

export interface EditableLine extends LineInput {
  product_name: string;
  description?: string;
}

export function emptyLine(): EditableLine {
  return {
    product_name: "",
    description: "",
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 18,
  };
}

export function LineItemsEditor({
  lines,
  setLines,
  taxType,
}: {
  lines: EditableLine[];
  setLines: (next: EditableLine[]) => void;
  taxType: TaxType;
}) {
  const totals = computeTotals(lines, taxType);

  const update = (i: number, patch: Partial<EditableLine>) => {
    const next = lines.slice();
    next[i] = { ...next[i], ...patch };
    setLines(next);
  };

  const remove = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Line items</Label>
      <div className="rounded-md border border-border overflow-hidden">
        <div className="bg-muted/40 px-3 py-2 grid grid-cols-12 gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <div className="col-span-4">Product</div>
          <div className="col-span-1 text-right">Qty</div>
          <div className="col-span-2 text-right">Unit ₹</div>
          <div className="col-span-1 text-right">Disc%</div>
          <div className="col-span-1 text-right">Tax%</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-1" />
        </div>
        <div className="divide-y divide-border">
          {lines.map((l, i) => {
            const c = computeLine(l, taxType);
            return (
              <div key={i} className="px-3 py-2 grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-4 h-8" placeholder="Item / SKU" value={l.product_name} onChange={(e) => update(i, { product_name: e.target.value })} />
                <Input className="col-span-1 h-8 text-right" type="number" min={0} step="0.01" value={l.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} />
                <Input className="col-span-2 h-8 text-right" type="number" min={0} step="0.01" value={l.unit_price} onChange={(e) => update(i, { unit_price: Number(e.target.value) })} />
                <Input className="col-span-1 h-8 text-right" type="number" min={0} max={100} step="0.01" value={l.discount_percent} onChange={(e) => update(i, { discount_percent: Number(e.target.value) })} />
                <Input className="col-span-1 h-8 text-right" type="number" min={0} max={100} step="0.01" value={l.tax_percent} onChange={(e) => update(i, { tax_percent: Number(e.target.value) })} />
                <div className="col-span-2 text-right font-medium tabular-nums">{inr(c.line_total)}</div>
                <div className="col-span-1 flex justify-end">
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {lines.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No items yet</div>
          )}
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => setLines([...lines, emptyLine()])}>
        <Plus className="h-3.5 w-3.5 mr-1" />Add line
      </Button>

      <div className="rounded-md border border-border bg-muted/20 p-3 space-y-1 text-sm max-w-sm ml-auto">
        <Row label="Subtotal" value={inr(totals.subtotal)} />
        <Row label="Discount" value={`- ${inr(totals.discount_total)}`} />
        {taxType === "intra_state" && (
          <>
            <Row label="CGST" value={inr(totals.cgst_total)} />
            <Row label="SGST" value={inr(totals.sgst_total)} />
          </>
        )}
        {taxType === "inter_state" && <Row label="IGST" value={inr(totals.igst_total)} />}
        <div className="border-t border-border pt-2 mt-2">
          <Row label="Grand total" value={inr(totals.grand_total)} bold />
        </div>
      </div>
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
