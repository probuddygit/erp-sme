import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { LEDGER, WAREHOUSES, STATUS_TONES, formatINR, formatDate, type LedgerEntry, type MoveType } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-ledger")({
  component: StockLedgerPage,
});

function StockLedgerPage() {
  const [type, setType] = useState("");
  const [wh, setWh] = useState("");
  const data = LEDGER.filter((l) => (!type || l.moveType === type) && (!wh || l.warehouse === wh));
  const columns: Column<LedgerEntry>[] = [
    { header: "Date", cell: (r) => formatDate(r.date) },
    { header: "Document", cell: (r) => <div><div className="font-medium">{r.docNo}</div><div className="text-xs text-muted-foreground">{r.docType}</div></div> },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => <span className="text-sm">{r.warehouse}</span> },
    { header: "Type", cell: (r) => <StatusBadge label={r.moveType} tone={STATUS_TONES[r.moveType]} /> },
    { header: "Qty", align: "right", cell: (r) => <span className={r.qty < 0 ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{r.qty > 0 ? `+${r.qty}` : r.qty}</span> },
    { header: "Balance", align: "right", cell: (r) => r.balance },
    { header: "Value", align: "right", cell: (r) => formatINR(r.value) },
    { header: "User", cell: (r) => <span className="text-xs text-muted-foreground">{r.user}</span> },
  ];

  const types: MoveType[] = ["IN", "OUT", "TRANSFER", "ADJUST"];

  return (
    <InventoryTable<LedgerEntry>
      title="Stock Ledger"
      description="Chronological stock movements across all items & warehouses."
      icon={BookOpen}
      data={data}
      columns={columns}
      searchable={(r) => `${r.docNo} ${r.itemName} ${r.itemCode} ${r.warehouse} ${r.docType}`}
      filters={[
        { key: "t", label: "Type", value: type, onChange: setType, options: types.map((t) => ({ value: t, label: t })) },
        { key: "wh", label: "Warehouse", value: wh, onChange: setWh, options: WAREHOUSES.map((w) => ({ value: w.name, label: w.name })) },
      ]}
      kpis={[
        { label: "Entries", value: String(data.length) },
        { label: "Inward",  value: String(data.filter((d) => d.moveType === "IN").length) },
        { label: "Outward", value: String(data.filter((d) => d.moveType === "OUT").length) },
        { label: "Value moved", value: formatINR(data.reduce((s, d) => s + d.value, 0)) },
      ]}
      newLabel="New Entry"
      pageSize={10}
    />
  );
}
