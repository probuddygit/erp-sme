import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { LEDGER, WAREHOUSES, STATUS_TONES, formatINR, formatDate, type LedgerEntry } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/movement-history")({
  component: MovementHistoryPage,
});

function MovementHistoryPage() {
  const [wh, setWh] = useState("");
  const [type, setType] = useState("");
  const data = LEDGER
    .filter((l) => (!wh || l.warehouse === wh) && (!type || l.moveType === type))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const columns: Column<LedgerEntry>[] = [
    { header: "When", cell: (r) => formatDate(r.date) },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Type", cell: (r) => <StatusBadge label={r.moveType} tone={STATUS_TONES[r.moveType]} /> },
    { header: "Document", cell: (r) => <div className="text-sm"><div>{r.docNo}</div><div className="text-xs text-muted-foreground">{r.docType}{r.ref ? ` · ${r.ref}` : ""}</div></div> },
    { header: "Qty", align: "right", cell: (r) => <span className={r.qty < 0 ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{r.qty > 0 ? `+${r.qty}` : r.qty}</span> },
    { header: "Value", align: "right", cell: (r) => formatINR(r.value) },
    { header: "User", cell: (r) => <span className="text-xs text-muted-foreground">{r.user}</span> },
  ];
  return (
    <InventoryTable<LedgerEntry>
      title="Movement History" description="Time-ordered audit trail of every stock movement." icon={History}
      data={data} columns={columns}
      searchable={(r) => `${r.docNo} ${r.itemCode} ${r.itemName} ${r.user}`}
      filters={[
        { key: "wh", label: "Warehouse", value: wh, onChange: setWh,
          options: WAREHOUSES.map((w) => ({ value: w.name, label: w.name })) },
        { key: "t", label: "Type", value: type, onChange: setType,
          options: [
            { value: "IN", label: "Inward" }, { value: "OUT", label: "Outward" },
            { value: "TRANSFER", label: "Transfer" }, { value: "ADJUST", label: "Adjustment" },
          ] },
      ]}
      kpis={[
        { label: "Events", value: String(data.length) },
        { label: "Inward", value: String(data.filter((d) => d.moveType === "IN").length) },
        { label: "Outward", value: String(data.filter((d) => d.moveType === "OUT").length) },
        { label: "Adjustments", value: String(data.filter((d) => d.moveType === "ADJUST").length) },
      ]}
      newLabel="Export"
      pageSize={12}
    />
  );
}
