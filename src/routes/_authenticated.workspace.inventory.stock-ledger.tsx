import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { STATUS_TONES } from "@/features/inventory/data";
import { useStockTransactions, useWarehouses, fmtINR, fmtDateTime, type StockTxnRow } from "@/features/inventory/api";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-ledger")({
  component: StockLedgerPage,
});

const TXN_TONE: Record<string, string> = {
  receipt: STATUS_TONES.IN,
  issue: STATUS_TONES.OUT,
  transfer_in: STATUS_TONES.TRANSFER,
  transfer_out: STATUS_TONES.TRANSFER,
  adjustment: STATUS_TONES.ADJUST,
  production_in: STATUS_TONES.IN,
  production_out: STATUS_TONES.OUT,
  opening: STATUS_TONES.IN,
};

function StockLedgerPage() {
  const { data: rows = [], isLoading } = useStockTransactions();
  const { data: warehouses = [] } = useWarehouses();
  const [type, setType] = useState("");
  const [wh, setWh] = useState("");
  const data = rows.filter((l) => (!type || l.txn_type === type) && (!wh || l.warehouse_id === wh));

  const columns: Column<StockTxnRow>[] = [
    { header: "Date", cell: (r) => fmtDateTime(r.occurred_at) },
    { header: "Type", cell: (r) => <StatusBadge label={r.txn_type.replace(/_/g, " ")} tone={TXN_TONE[r.txn_type] ?? STATUS_TONES.ADJUST} /> },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.item?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.item?.sku ?? ""}</div></div> },
    { header: "Warehouse", cell: (r) => <span className="text-sm">{r.warehouse?.name ?? "—"}</span> },
    { header: "Reference", cell: (r) => <span className="text-xs text-muted-foreground">{r.reference_type ?? "—"}</span> },
    { header: "Qty", align: "right", cell: (r) => <span className={Number(r.quantity) < 0 ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{Number(r.quantity) > 0 ? `+${r.quantity}` : r.quantity}</span> },
    { header: "Unit Cost", align: "right", cell: (r) => fmtINR(Number(r.unit_cost)) },
    { header: "Value", align: "right", cell: (r) => fmtINR(Number(r.total_value)) },
  ];

  return (
    <InventoryTable<StockTxnRow>
      title="Stock Ledger"
      description="Chronological stock movements across all items & warehouses (last 500 events)."
      icon={BookOpen}
      data={data}
      columns={columns}
      loading={isLoading}
      searchable={(r) => `${r.item?.name ?? ""} ${r.item?.sku ?? ""} ${r.warehouse?.name ?? ""} ${r.reference_type ?? ""} ${r.notes ?? ""}`}
      filters={[
        { key: "t", label: "Type", value: type, onChange: setType, options: [
          { value: "receipt", label: "Receipt" },
          { value: "issue", label: "Issue" },
          { value: "transfer_in", label: "Transfer In" },
          { value: "transfer_out", label: "Transfer Out" },
          { value: "adjustment", label: "Adjustment" },
          { value: "production_in", label: "Production In" },
          { value: "production_out", label: "Production Out" },
        ] },
        { key: "wh", label: "Warehouse", value: wh, onChange: setWh, options: warehouses.map((w) => ({ value: w.id, label: w.name })) },
      ]}
      kpis={[
        { label: "Entries", value: String(data.length) },
        { label: "Inward",  value: String(data.filter((d) => Number(d.quantity) > 0).length) },
        { label: "Outward", value: String(data.filter((d) => Number(d.quantity) < 0).length) },
        { label: "Value moved", value: fmtINR(data.reduce((s, d) => s + Math.abs(Number(d.total_value)), 0)) },
      ]}
      pageSize={10}
    />
  );
}
