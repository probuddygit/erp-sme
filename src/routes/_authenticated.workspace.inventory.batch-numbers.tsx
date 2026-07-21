import { createFileRoute } from "@tanstack/react-router";
import { Layers, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { BATCHES, STATUS_TONES, formatDate, type BatchNo } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/batch-numbers")({
  component: BatchesPage,
});

function BatchesPage() {
  const [status, setStatus] = useState("");
  const data = BATCHES.filter((b) => !status || b.status === status);
  const columns: Column<BatchNo>[] = [
    { header: "Batch #", cell: (r) => <span className="font-mono text-sm font-medium">{r.batchNo}</span> },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Mfg Date", cell: (r) => formatDate(r.mfgDate) },
    { header: "Expiry", cell: (r) => formatDate(r.expiryDate) },
    { header: "Qty", align: "right", cell: (r) => r.qty },
    { header: "Status", cell: (r) => <StatusBadge label={r.status} tone={STATUS_TONES[r.status]} /> },
    { header: "", align: "right", cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
          <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
          <DropdownMenuItem className="text-rose-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ];
  return (
    <InventoryTable<BatchNo>
      title="Batches" description="Batch-tracked stock with manufacture & expiry dates." icon={Layers}
      data={data} columns={columns}
      searchable={(r) => `${r.batchNo} ${r.itemCode} ${r.itemName} ${r.warehouse}`}
      filters={[{ key: "s", label: "Status", value: status, onChange: setStatus,
        options: [
          { value: "ok", label: "OK" }, { value: "expiring", label: "Expiring" },
          { value: "expired", label: "Expired" }, { value: "quarantine", label: "Quarantine" },
        ] }]}
      kpis={[
        { label: "Batches", value: String(BATCHES.length) },
        { label: "OK", value: String(BATCHES.filter((b) => b.status === "ok").length) },
        { label: "Expiring", value: String(BATCHES.filter((b) => b.status === "expiring").length) },
        { label: "Expired", value: String(BATCHES.filter((b) => b.status === "expired").length) },
      ]}
      newLabel="New Batch"
    />
  );
}
