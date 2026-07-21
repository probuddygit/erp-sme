import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { AGING, formatINR, type AgingRow } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-aging")({
  component: AgingPage,
});

function AgingPage() {
  const columns: Column<AgingRow>[] = [
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "0-30 days", align: "right", cell: (r) => r.d0_30 },
    { header: "31-60 days", align: "right", cell: (r) => r.d31_60 },
    { header: "61-90 days", align: "right", cell: (r) => r.d61_90 },
    { header: "91-180 days", align: "right", cell: (r) => r.d91_180 },
    { header: "180+ days", align: "right", cell: (r) => <span className={r.d180plus > 0 ? "font-medium text-rose-600" : ""}>{r.d180plus}</span> },
    { header: "Total", align: "right", cell: (r) => <span className="font-medium">{r.total}</span> },
    { header: "Value", align: "right", cell: (r) => formatINR(r.value) },
  ];
  const totVal = AGING.reduce((s, r) => s + r.value, 0);
  const totOld = AGING.reduce((s, r) => s + r.d180plus, 0);
  return (
    <InventoryTable<AgingRow>
      title="Stock Aging" description="Age analysis of on-hand stock by day buckets." icon={TrendingUp}
      data={AGING} columns={columns}
      searchable={(r) => `${r.itemCode} ${r.itemName} ${r.warehouse}`}
      kpis={[
        { label: "SKUs", value: String(AGING.length) },
        { label: "Total value", value: formatINR(totVal) },
        { label: "Aged 180+", value: String(totOld) },
        { label: "Slow movers", value: String(AGING.filter((a) => a.d180plus > 0).length) },
      ]}
      newLabel="Export Aging"
    />
  );
}
