import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useState } from "react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { useStockTransactions, useWarehouses, fmtINR, fmtDateTime, type StockTxnRow } from "@/features/inventory/api";
import { exportCsv } from "@/features/inventory/inventory-api";
import { STATUS_TONES } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/movement-history")({
  component: MovementHistoryPage,
});

const direction = (r: StockTxnRow) => {
  if (r.txn_type === "adjustment") return "ADJUST";
  if (r.txn_type === "transfer_in" || r.txn_type === "transfer_out") return "TRANSFER";
  return Number(r.quantity) >= 0 ? "IN" : "OUT";
};

function MovementHistoryPage() {
  const { data: rows = [], isLoading } = useStockTransactions();
  const { data: warehouses = [] } = useWarehouses();
  const [wh, setWh] = useState("");
  const [dir, setDir] = useState("");

  const data = rows.filter((r) => (!wh || r.warehouse_id === wh) && (!dir || direction(r) === dir));

  const columns: Column<StockTxnRow>[] = [
    { header: "When", cell: (r) => fmtDateTime(r.occurred_at) },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.item?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.item?.sku ?? ""}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse?.name ?? "—" },
    { header: "Type", cell: (r) => <StatusBadge label={direction(r)} tone={STATUS_TONES[direction(r)]} /> },
    { header: "Source", cell: (r) => <div className="text-sm"><div>{r.txn_type.replace(/_/g, " ")}</div><div className="text-xs text-muted-foreground">{r.reference_type ?? "manual"}</div></div> },
    { header: "Qty", align: "right", cell: (r) => <span className={Number(r.quantity) < 0 ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{Number(r.quantity) > 0 ? `+${r.quantity}` : r.quantity}</span> },
    { header: "Value", align: "right", cell: (r) => fmtINR(Math.abs(Number(r.total_value))) },
    { header: "Notes", cell: (r) => <span className="text-xs text-muted-foreground">{r.notes ?? "—"}</span> },
  ];

  return (
    <InventoryTable<StockTxnRow>
      title="Movement History" description="Time-ordered audit trail of every stock movement across modules." icon={History}
      data={data} columns={columns} loading={isLoading}
      searchable={(r) => `${r.item?.name ?? ""} ${r.item?.sku ?? ""} ${r.warehouse?.name ?? ""} ${r.reference_type ?? ""} ${r.notes ?? ""}`}
      filters={[
        { key: "wh", label: "Warehouse", value: wh, onChange: setWh, options: warehouses.map((w) => ({ value: w.id, label: w.name })) },
        { key: "d", label: "Direction", value: dir, onChange: setDir, options: [
          { value: "IN", label: "Inward" }, { value: "OUT", label: "Outward" },
          { value: "TRANSFER", label: "Transfer" }, { value: "ADJUST", label: "Adjustment" },
        ] },
      ]}
      kpis={[
        { label: "Events", value: String(data.length) },
        { label: "Inward", value: String(data.filter((d) => direction(d) === "IN").length) },
        { label: "Outward", value: String(data.filter((d) => direction(d) === "OUT").length) },
        { label: "Adjustments", value: String(data.filter((d) => direction(d) === "ADJUST").length) },
      ]}
      pageSize={12}
      onExport={() => exportCsv("movement-history.csv", data.map((r) => ({
        when: r.occurred_at, item: r.item?.name ?? "", sku: r.item?.sku ?? "", warehouse: r.warehouse?.name ?? "",
        type: r.txn_type, reference: r.reference_type ?? "", qty: r.quantity, value: r.total_value,
      })))}
    />
  );
}
