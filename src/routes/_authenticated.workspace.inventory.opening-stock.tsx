import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { OpeningStockDialog } from "@/features/inventory/components/OpeningStockDialog";
import { useItems, useWarehouses, fmtINR, fmtNum, fmtDate } from "@/features/inventory/api";
import { useOpeningStock, exportCsv } from "@/features/inventory/inventory-api";

export const Route = createFileRoute("/_authenticated/workspace/inventory/opening-stock")({
  component: OpeningStockPage,
});

interface OpenRow {
  id: string; itemName: string; itemCode: string; warehouse: string;
  qty: number; rate: number; value: number; postedOn: string;
}

function OpeningStockPage() {
  const { data: txns = [], isLoading } = useOpeningStock();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const [open, setOpen] = useState(false);

  const rows = useMemo<OpenRow[]>(() => {
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const whMap = new Map(warehouses.map((w) => [w.id, w]));
    return txns.map((t) => ({
      id: t.id,
      itemName: itemMap.get(t.item_id)?.name ?? "—",
      itemCode: itemMap.get(t.item_id)?.sku ?? "",
      warehouse: whMap.get(t.warehouse_id)?.name ?? "—",
      qty: Number(t.quantity),
      rate: Number(t.unit_cost),
      value: Math.abs(Number(t.total_value)),
      postedOn: t.occurred_at,
    }));
  }, [txns, items, warehouses]);

  const columns: Column<OpenRow>[] = [
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Qty", align: "right", cell: (r) => fmtNum(r.qty) },
    { header: "Rate", align: "right", cell: (r) => fmtINR(r.rate) },
    { header: "Value", align: "right", cell: (r) => <span className="font-medium">{fmtINR(r.value)}</span> },
    { header: "Posted On", cell: (r) => fmtDate(r.postedOn) },
  ];

  return (
    <>
      <InventoryTable<OpenRow>
        title="Opening Stock" description="Opening balances posted into stock batches and the ledger." icon={PlayCircle}
        data={rows} columns={columns} loading={isLoading}
        searchable={(r) => `${r.itemCode} ${r.itemName} ${r.warehouse}`}
        kpis={[
          { label: "Entries", value: String(rows.length) },
          { label: "Qty", value: fmtNum(rows.reduce((s, o) => s + o.qty, 0)) },
          { label: "Value", value: fmtINR(rows.reduce((s, o) => s + o.value, 0)) },
          { label: "Items covered", value: String(new Set(rows.map((r) => r.itemCode)).size) },
        ]}
        newLabel="Post Opening Stock"
        onNew={() => setOpen(true)}
        onExport={() => exportCsv("opening-stock.csv", rows.map(({ id, ...r }) => r))}
      />
      <OpeningStockDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
