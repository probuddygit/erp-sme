import { createFileRoute } from "@tanstack/react-router";
import { Sliders, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { ADJUSTMENTS, STATUS_TONES, formatDate, type StockAdjustment } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/stock-adjustment")({
  component: AdjustmentPage,
});

function AdjustmentPage() {
  const columns: Column<StockAdjustment>[] = [
    { header: "Adj #", cell: (r) => <span className="font-medium">{r.number}</span> },
    { header: "Date", cell: (r) => formatDate(r.date) },
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "System", align: "right", cell: (r) => r.systemQty },
    { header: "Physical", align: "right", cell: (r) => r.physicalQty },
    { header: "Variance", align: "right", cell: (r) => <span className={r.variance < 0 ? "font-medium text-rose-600" : "font-medium text-emerald-600"}>{r.variance > 0 ? `+${r.variance}` : r.variance}</span> },
    { header: "Reason", cell: (r) => <span className="text-sm">{r.reason}</span> },
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
    <InventoryTable<StockAdjustment>
      title="Stock Adjustments" description="Post variances between system and physical stock." icon={Sliders}
      data={ADJUSTMENTS} columns={columns}
      searchable={(r) => `${r.number} ${r.itemCode} ${r.itemName} ${r.reason}`}
      kpis={[
        { label: "Adjustments", value: String(ADJUSTMENTS.length) },
        { label: "Draft", value: String(ADJUSTMENTS.filter((a) => a.status === "draft").length) },
        { label: "Posted", value: String(ADJUSTMENTS.filter((a) => a.status === "posted").length) },
        { label: "Net variance", value: String(ADJUSTMENTS.reduce((s, a) => s + a.variance, 0)) },
      ]}
      newLabel="New Adjustment"
    />
  );
}
