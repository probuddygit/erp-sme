import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, MoreHorizontal, Eye, Pencil, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { TRANSFERS, STATUS_TONES, formatDate, type StockTransfer } from "@/features/inventory/data";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-transfer")({
  component: TransferPage,
});

function TransferPage() {
  const [status, setStatus] = useState("");
  const data = TRANSFERS.filter((t) => !status || t.status === status);
  const columns: Column<StockTransfer>[] = [
    { header: "Transfer #", cell: (r) => <span className="font-medium">{r.number}</span> },
    { header: "Date", cell: (r) => formatDate(r.date) },
    { header: "From → To", cell: (r) => <div className="flex items-center gap-1 text-sm"><span>{r.fromWh}</span><ArrowRight className="h-3 w-3 text-muted-foreground" /><span>{r.toWh}</span></div> },
    { header: "Lines", align: "right", cell: (r) => r.lines },
    { header: "Qty",   align: "right", cell: (r) => r.qty },
    { header: "Requested By", cell: (r) => r.requestedBy },
    { header: "Approver", cell: (r) => r.approver },
    { header: "Status", cell: (r) => <StatusBadge label={r.status.replace(/_/g, " ")} tone={STATUS_TONES[r.status]} /> },
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
    <InventoryTable<StockTransfer>
      title="Stock Transfers" description="Move stock between warehouses with approval." icon={ArrowLeftRight}
      data={data} columns={columns}
      searchable={(r) => `${r.number} ${r.fromWh} ${r.toWh} ${r.requestedBy}`}
      filters={[{ key: "s", label: "Status", value: status, onChange: setStatus,
        options: [
          { value: "draft", label: "Draft" }, { value: "in_transit", label: "In Transit" },
          { value: "received", label: "Received" }, { value: "posted", label: "Posted" },
        ] }]}
      kpis={[
        { label: "Transfers", value: String(data.length) },
        { label: "In transit", value: String(data.filter((d) => d.status === "in_transit").length) },
        { label: "Received", value: String(data.filter((d) => d.status === "received").length) },
        { label: "Posted", value: String(data.filter((d) => d.status === "posted").length) },
      ]}
      newLabel="New Transfer"
    />
  );
}
