import { createFileRoute } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { useItems, useWarehouses, fmtDate, fmtINR, fmtNum } from "@/features/inventory/api";
import { useStockBatches, batchStatus, ageDays, exportCsv, type BatchRow } from "@/features/inventory/inventory-api";
import { STATUS_TONES } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/batch-numbers")({
  component: BatchesPage,
});

function BatchesPage() {
  const { data: batches = [], isLoading } = useStockBatches();
  const { data: items = [] } = useItems();
  const { data: warehouses = [] } = useWarehouses();
  const [status, setStatus] = useState("");
  const [wh, setWh] = useState("");

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const whMap = useMemo(() => new Map(warehouses.map((w) => [w.id, w])), [warehouses]);
  const data = batches.filter((b) =>
    (!status || batchStatus(b) === status) && (!wh || b.warehouse_id === wh));

  const columns: Column<BatchRow>[] = [
    { header: "Batch #", cell: (r) => <span className="font-mono text-sm font-medium">{r.batch_no}</span> },
    { header: "Item", cell: (r) => {
      const it = itemMap.get(r.item_id);
      return <div><div className="font-medium">{it?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{it?.sku ?? ""}</div></div>;
    } },
    { header: "Warehouse", cell: (r) => whMap.get(r.warehouse_id)?.name ?? "—" },
    { header: "Received", cell: (r) => fmtDate(r.received_at) },
    { header: "Age", align: "right", cell: (r) => `${ageDays(r.received_at)}d` },
    { header: "Expiry", cell: (r) => fmtDate(r.expiry_date) },
    { header: "Remaining", align: "right", cell: (r) => `${fmtNum(Number(r.qty_remaining))} / ${fmtNum(Number(r.qty_received))}` },
    { header: "Value", align: "right", cell: (r) => fmtINR(Number(r.qty_remaining) * Number(r.landed_cost_per_unit || r.unit_cost)) },
    { header: "Status", cell: (r) => {
      const s = batchStatus(r);
      return <StatusBadge label={s} tone={STATUS_TONES[s] ?? STATUS_TONES.inactive} />;
    } },
  ];

  return (
    <InventoryTable<BatchRow>
      title="Batches" description="Live batch-tracked stock created by receipts, production & adjustments." icon={Layers}
      data={data} columns={columns} loading={isLoading}
      searchable={(r) => `${r.batch_no} ${itemMap.get(r.item_id)?.name ?? ""} ${itemMap.get(r.item_id)?.sku ?? ""}`}
      filters={[
        { key: "s", label: "Status", value: status, onChange: setStatus, options: [
          { value: "ok", label: "OK" }, { value: "expiring", label: "Expiring" },
          { value: "expired", label: "Expired" }, { value: "consumed", label: "Consumed" },
        ] },
        { key: "wh", label: "Warehouse", value: wh, onChange: setWh, options: warehouses.map((w) => ({ value: w.id, label: w.name })) },
      ]}
      kpis={[
        { label: "Batches", value: String(data.length) },
        { label: "Open", value: String(data.filter((b) => Number(b.qty_remaining) > 0).length) },
        { label: "Expiring", value: String(data.filter((b) => batchStatus(b) === "expiring").length) },
        { label: "Expired", value: String(data.filter((b) => batchStatus(b) === "expired").length) },
      ]}
      pageSize={10}
      onExport={() => exportCsv("batches.csv", data.map((b) => ({
        batch_no: b.batch_no, item: itemMap.get(b.item_id)?.name ?? "", warehouse: whMap.get(b.warehouse_id)?.name ?? "",
        received: b.received_at, expiry: b.expiry_date ?? "", remaining: b.qty_remaining, unit_cost: b.unit_cost,
      })))}
    />
  );
}
