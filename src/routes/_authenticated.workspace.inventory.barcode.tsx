import { createFileRoute } from "@tanstack/react-router";
import { QrCode, Printer, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { RowActions } from "@/components/RowActions";
import { BarcodeFormDialog } from "@/features/inventory/components/BarcodeFormDialog";
import { useItems, fmtDate } from "@/features/inventory/api";
import {
  useBarcodes, useGenerateBarcodes, useMarkBarcodePrinted, printLabel, barcodeLabelHtml,
  exportCsv, type BarcodeRow,
} from "@/features/inventory/inventory-api";

export const Route = createFileRoute("/_authenticated/workspace/inventory/barcode")({
  component: BarcodePage,
});

function BarcodePage() {
  const { data: barcodes = [], isLoading } = useBarcodes();
  const { data: items = [] } = useItems();
  const generate = useGenerateBarcodes();
  const markPrinted = useMarkBarcodePrinted();
  const [format, setFormat] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BarcodeRow | null>(null);

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const data = barcodes.filter((b) => !format || b.format === format);

  const doPrint = (r: BarcodeRow) => {
    const it = itemMap.get(r.item_id);
    printLabel(barcodeLabelHtml(it?.name ?? "Item", `${it?.sku ?? ""} · ${r.format}`, r.barcode));
    markPrinted.mutate(r);
  };

  const columns: Column<BarcodeRow>[] = [
    { header: "Item", cell: (r) => {
      const it = itemMap.get(r.item_id);
      return <div><div className="font-medium">{it?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{it?.sku ?? ""}</div></div>;
    } },
    { header: "Barcode", cell: (r) => <span className="font-mono text-sm">{r.barcode}</span> },
    { header: "Format", cell: (r) => <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">{r.format}</span> },
    { header: "Printed", align: "right", cell: (r) => r.printed_count },
    { header: "Last Printed", cell: (r) => r.last_printed_at ? fmtDate(r.last_printed_at) : "—" },
    { header: "", align: "right", cell: (r) => (
      <div className="flex items-center justify-end gap-1">
        <Button size="sm" variant="outline" onClick={() => doPrint(r)}><Printer className="mr-1.5 h-3.5 w-3.5" /> Print</Button>
        <RowActions onEdit={() => { setEditing(r); setOpen(true); }} table="item_barcodes" id={r.id}
          invalidateKeys={[["inv", "barcodes"]]} label={`barcode ${r.barcode}`} />
      </div>
    ) },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="outline" disabled={generate.isPending}
          onClick={() => generate.mutate({ items: items.map((i) => ({ id: i.id, sku: i.sku })), existing: barcodes.map((b) => b.item_id) })}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Auto-generate for items without barcodes
        </Button>
      </div>
      <InventoryTable<BarcodeRow>
        title="Barcodes" description="Generate & print item barcodes / QR labels." icon={QrCode}
        data={data} columns={columns} loading={isLoading}
        searchable={(r) => `${r.barcode} ${itemMap.get(r.item_id)?.name ?? ""} ${itemMap.get(r.item_id)?.sku ?? ""}`}
        filters={[{ key: "f", label: "Format", value: format, onChange: setFormat,
          options: [{ value: "EAN-13", label: "EAN-13" }, { value: "Code128", label: "Code128" }, { value: "QR", label: "QR" }] }]}
        kpis={[
          { label: "Barcodes", value: String(barcodes.length) },
          { label: "Items covered", value: `${new Set(barcodes.map((b) => b.item_id)).size}/${items.length}` },
          { label: "Labels printed", value: String(barcodes.reduce((s, b) => s + (b.printed_count ?? 0), 0)) },
          { label: "QR", value: String(barcodes.filter((b) => b.format === "QR").length) },
        ]}
        newLabel="New Barcode"
        onNew={() => { setEditing(null); setOpen(true); }}
        onExport={() => exportCsv("barcodes.csv", data.map((b) => ({
          item: itemMap.get(b.item_id)?.name ?? "", sku: itemMap.get(b.item_id)?.sku ?? "",
          barcode: b.barcode, format: b.format, printed: b.printed_count,
        })))}
      />
      <BarcodeFormDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}
