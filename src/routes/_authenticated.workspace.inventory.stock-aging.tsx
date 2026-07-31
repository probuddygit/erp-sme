import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { useItems, useWarehouses, fmtINR, fmtNum } from "@/features/inventory/api";
import { useStockBatches, ageDays, exportCsv } from "@/features/inventory/inventory-api";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-aging")({
  component: AgingPage,
});

interface AgingRow {
  id: string; itemName: string; itemCode: string; warehouse: string;
  d0_30: number; d31_60: number; d61_90: number; d91_180: number; d180plus: number;
  total: number; value: number;
}

function AgingPage() {
  const { data: batches = [], isLoading } = useStockBatches();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const [wh, setWh] = useState("");

  const rows = useMemo<AgingRow[]>(() => {
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));
    const acc = new Map<string, AgingRow>();
    batches.filter((b) => Number(b.qty_remaining) > 0).forEach((b) => {
      const key = `${b.item_id}:${b.warehouse_id}`;
      const row = acc.get(key) ?? {
        id: key,
        itemName: itemMap.get(b.item_id)?.name ?? "—",
        itemCode: itemMap.get(b.item_id)?.sku ?? "",
        warehouse: whMap.get(b.warehouse_id)?.name ?? "—",
        d0_30: 0, d31_60: 0, d61_90: 0, d91_180: 0, d180plus: 0, total: 0, value: 0,
      };
      const qty = Number(b.qty_remaining);
      const age = ageDays(b.received_at);
      if (age <= 30) row.d0_30 += qty;
      else if (age <= 60) row.d31_60 += qty;
      else if (age <= 90) row.d61_90 += qty;
      else if (age <= 180) row.d91_180 += qty;
      else row.d180plus += qty;
      row.total += qty;
      row.value += qty * Number(b.landed_cost_per_unit || b.unit_cost);
      acc.set(key, row);
    });
    return Array.from(acc.values()).sort((a, b) => b.value - a.value);
  }, [batches, items, warehouses]);

  const data = rows.filter((r) => !wh || r.warehouse === wh);

  const columns: Column<AgingRow>[] = [
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "0-30 days", align: "right", cell: (r) => fmtNum(r.d0_30) },
    { header: "31-60 days", align: "right", cell: (r) => fmtNum(r.d31_60) },
    { header: "61-90 days", align: "right", cell: (r) => fmtNum(r.d61_90) },
    { header: "91-180 days", align: "right", cell: (r) => fmtNum(r.d91_180) },
    { header: "180+ days", align: "right", cell: (r) => <span className={r.d180plus > 0 ? "font-medium text-rose-600" : ""}>{fmtNum(r.d180plus)}</span> },
    { header: "Total", align: "right", cell: (r) => <span className="font-medium">{fmtNum(r.total)}</span> },
    { header: "Value", align: "right", cell: (r) => fmtINR(r.value) },
  ];

  return (
    <InventoryTable<AgingRow>
      title="Stock Aging" description="Age analysis of on-hand batches by day buckets." icon={TrendingUp}
      data={data} columns={columns} loading={isLoading}
      searchable={(r) => `${r.itemCode} ${r.itemName} ${r.warehouse}`}
      filters={[{ key: "wh", label: "Warehouse", value: wh, onChange: setWh, options: warehouses.map((w) => ({ value: w.name, label: w.name })) }]}
      kpis={[
        { label: "SKU / WH rows", value: String(data.length) },
        { label: "Total value", value: fmtINR(data.reduce((s, r) => s + r.value, 0)) },
        { label: "Aged 180+", value: fmtNum(data.reduce((s, r) => s + r.d180plus, 0)) },
        { label: "Slow movers", value: String(data.filter((r) => r.d180plus > 0).length) },
      ]}
      onExport={() => exportCsv("stock-aging.csv", data.map(({ id, ...r }) => r))}
    />
  );
}
