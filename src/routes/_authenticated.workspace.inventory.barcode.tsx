import { createFileRoute } from "@tanstack/react-router";
import { QrCode, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { BARCODES, formatDate, type BarcodeRow } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/barcode")({
  component: BarcodePage,
});

function BarcodePage() {
  const [format, setFormat] = useState("");
  const data = BARCODES.filter((b) => !format || b.format === format);
  const columns: Column<BarcodeRow>[] = [
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Barcode", cell: (r) => <span className="font-mono text-sm">{r.barcode}</span> },
    { header: "Format", cell: (r) => <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">{r.format}</span> },
    { header: "Printed", align: "right", cell: (r) => r.printed },
    { header: "Last Printed", cell: (r) => formatDate(r.lastPrinted) },
    { header: "", align: "right", cell: () => (
      <Button size="sm" variant="outline"><Printer className="mr-1.5 h-3.5 w-3.5" /> Print</Button>
    ) },
  ];
  return (
    <InventoryTable<BarcodeRow>
      title="Barcodes" description="Generate & print item barcodes / QR labels." icon={QrCode}
      data={data} columns={columns}
      searchable={(r) => `${r.itemCode} ${r.itemName} ${r.barcode}`}
      filters={[{ key: "f", label: "Format", value: format, onChange: setFormat,
        options: [{ value: "EAN-13", label: "EAN-13" }, { value: "Code128", label: "Code128" }, { value: "QR", label: "QR" }] }]}
      kpis={[
        { label: "Items", value: String(BARCODES.length) },
        { label: "QR", value: String(BARCODES.filter((b) => b.format === "QR").length) },
        { label: "Code128", value: String(BARCODES.filter((b) => b.format === "Code128").length) },
        { label: "EAN-13", value: String(BARCODES.filter((b) => b.format === "EAN-13").length) },
      ]}
      newLabel="Generate Barcodes"
    />
  );
}
