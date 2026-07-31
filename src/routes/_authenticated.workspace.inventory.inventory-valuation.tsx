import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { useItems, useWarehouses, fmtINR, fmtNum } from "@/features/inventory/api";
import { useStockBatches, exportCsv } from "@/features/inventory/inventory-api";

export const Route = createFileRoute("/_authenticated/workspace/inventory/inventory-valuation")({
  component: ValuationPage,
});

interface ValRow {
  id: string; itemName: string; itemCode: string; category: string; warehouse: string;
  qty: number; avgRate: number; value: number; method: string;
}

function ValuationPage() {
  const { data: batches = [], isLoading } = useStockBatches();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const [cat, setCat] = useState("");
  const [method, setMethod] = useState("");

  const rows = useMemo<ValRow[]>(() => {
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));
    const acc = new Map<string, ValRow>();
    batches.filter((b) => Number(b.qty_remaining) > 0).forEach((b) => {
      const it = itemMap.get(b.item_id);
      const key = `${b.item_id}:${b.warehouse_id}`;
      const row = acc.get(key) ?? {
        id: key,
        itemName: it?.name ?? "—",
        itemCode: it?.sku ?? "",
        category: (it?.item_type ?? "raw_material").replace(/_/g, " "),
        warehouse: whMap.get(b.warehouse_id)?.name ?? "—",
        qty: 0, avgRate: 0, value: 0,
        method: it?.valuation_method === "fifo" ? "FIFO" : "Weighted Avg",
      };
      row.qty += Number(b.qty_remaining);
      row.value += Number(b.qty_remaining) * Number(b.landed_cost_per_unit || b.unit_cost);
      acc.set(key, row);
    });
    return Array.from(acc.values())
      .map((r) => ({ ...r, avgRate: r.qty ? r.value / r.qty : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [batches, items, warehouses]);

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category))), [rows]);
  const data = rows.filter((v) => (!cat || v.category === cat) && (!method || v.method === method));

  const columns: Column<ValRow>[] = [
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Category", cell: (r) => r.category },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Qty", align: "right", cell: (r) => fmtNum(r.qty) },
    { header: "Avg Rate", align: "right", cell: (r) => fmtINR(r.avgRate) },
    { header: "Value", align: "right", cell: (r) => <span className="font-medium">{fmtINR(r.value)}</span> },
    { header: "Method", cell: (r) => <span className="inline-flex rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">{r.method}</span> },
  ];

  const total = data.reduce((s, r) => s + r.value, 0);

  return (
    <InventoryTable<ValRow>
      title="Inventory Valuation" description="Live stock value from open batches by item, category & costing method." icon={Wallet}
      data={data} columns={columns} loading={isLoading}
      searchable={(r) => `${r.itemCode} ${r.itemName} ${r.category}`}
      filters={[
        { key: "c", label: "Category", value: cat, onChange: setCat, options: categories.map((c) => ({ value: c, label: c })) },
        { key: "m", label: "Method", value: method, onChange: setMethod, options: [{ value: "FIFO", label: "FIFO" }, { value: "Weighted Avg", label: "Weighted Avg" }] },
      ]}
      kpis={[
        { label: "SKU / WH rows", value: String(data.length) },
        { label: "Total Qty", value: fmtNum(data.reduce((s, r) => s + r.qty, 0)) },
        { label: "Total Value", value: fmtINR(total) },
        { label: "Avg per row", value: fmtINR(data.length ? total / data.length : 0) },
      ]}
      onExport={() => exportCsv("valuation.csv", data.map(({ id, ...r }) => r))}
    />
  );
}
