import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { VALUATION, CATEGORIES_LIST, formatINR, type ValuationRow } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/inventory-valuation")({
  component: ValuationPage,
});

function ValuationPage() {
  const [cat, setCat] = useState("");
  const [method, setMethod] = useState("");
  const data = VALUATION.filter((v) => (!cat || v.category === cat) && (!method || v.method === method));
  const columns: Column<ValuationRow>[] = [
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Category", cell: (r) => r.category },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Qty", align: "right", cell: (r) => r.qty },
    { header: "Avg Rate", align: "right", cell: (r) => formatINR(r.avgRate) },
    { header: "Value", align: "right", cell: (r) => <span className="font-medium">{formatINR(r.value)}</span> },
    { header: "Method", cell: (r) => <span className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">{r.method}</span> },
  ];
  const total = data.reduce((s, r) => s + r.value, 0);
  return (
    <InventoryTable<ValuationRow>
      title="Inventory Valuation" description="Stock value by item, category & costing method." icon={Wallet}
      data={data} columns={columns}
      searchable={(r) => `${r.itemCode} ${r.itemName} ${r.category}`}
      filters={[
        { key: "c", label: "Category", value: cat, onChange: setCat,
          options: CATEGORIES_LIST.map((c) => ({ value: c, label: c })) },
        { key: "m", label: "Method", value: method, onChange: setMethod,
          options: [{ value: "FIFO", label: "FIFO" }, { value: "Weighted Avg", label: "Weighted Avg" }] },
      ]}
      kpis={[
        { label: "SKUs", value: String(data.length) },
        { label: "Total Qty", value: String(data.reduce((s, r) => s + r.qty, 0)) },
        { label: "Total Value", value: formatINR(total) },
        { label: "Avg per SKU", value: formatINR(data.length ? Math.round(total / data.length) : 0) },
      ]}
      newLabel="Revalue"
    />
  );
}
