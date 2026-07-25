import { createFileRoute } from "@tanstack/react-router";
import { Sliders } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { AdjustmentDialog } from "@/features/inventory/components/AdjustmentDialog";
import { useStockTransactions, fmtINR, fmtDateTime } from "@/features/inventory/api";
import { STATUS_TONES } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-adjustment")({
  component: AdjustmentPage,
});

interface Row {
  id: string; occurred_at: string; txn_type: string; quantity: number;
  unit_cost: number; total_value: number; notes: string | null;
  item: { name: string; sku: string } | null;
  warehouse: { name: string; code: string } | null;
}

function AdjustmentPage() {
  const { data: rows = [], isLoading } = useStockTransactions() as { data: Row[]; isLoading: boolean };
  const adjustments = rows.filter((r) => r.txn_type === "adjustment");
  const [open, setOpen] = useState(false);

  const columns: Column<Row>[] = [
    { header: "Date", cell: (r) => fmtDateTime(r.occurred_at) },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.item?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.item?.sku}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse?.name ?? "—" },
    { header: "Variance", align: "right", cell: (r) => <span className={Number(r.quantity) < 0 ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{Number(r.quantity) > 0 ? `+${r.quantity}` : r.quantity}</span> },
    { header: "Value", align: "right", cell: (r) => fmtINR(Math.abs(Number(r.total_value))) },
    { header: "Reason", cell: (r) => <span className="text-sm">{r.notes?.replace(/^Adjustment:\s*/, "") ?? "—"}</span> },
    { header: "Status", cell: () => <StatusBadge label="posted" tone={STATUS_TONES.posted} /> },
  ];

  const netVariance = adjustments.reduce((s, a) => s + Number(a.quantity), 0);

  return (
    <>
      <InventoryTable<Row>
        title="Stock Adjustments" description="Post variances between system and physical stock." icon={Sliders}
        data={adjustments} columns={columns} loading={isLoading}
        searchable={(r) => `${r.item?.name ?? ""} ${r.item?.sku ?? ""} ${r.notes ?? ""}`}
        kpis={[
          { label: "Adjustments", value: String(adjustments.length) },
          { label: "Increases", value: String(adjustments.filter((a) => Number(a.quantity) > 0).length) },
          { label: "Decreases", value: String(adjustments.filter((a) => Number(a.quantity) < 0).length) },
          { label: "Net variance", value: String(netVariance) },
        ]}
        newLabel="New Adjustment"
        onNew={() => setOpen(true)}
      />
      <AdjustmentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
