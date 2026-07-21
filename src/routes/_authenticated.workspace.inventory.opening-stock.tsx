import { createFileRoute } from "@tanstack/react-router";
import { PlayCircle, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { OPENING_STOCK, formatINR, formatDate, type OpeningStock } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/opening-stock")({
  component: OpeningStockPage,
});

function OpeningStockPage() {
  const columns: Column<OpeningStock>[] = [
    { header: "Item", cell: (r) => <div><div className="font-medium">{r.itemName}</div><div className="text-xs text-muted-foreground">{r.itemCode}</div></div> },
    { header: "Warehouse", cell: (r) => r.warehouse },
    { header: "Qty", align: "right", cell: (r) => r.qty },
    { header: "Rate", align: "right", cell: (r) => formatINR(r.rate) },
    { header: "Value", align: "right", cell: (r) => <span className="font-medium">{formatINR(r.value)}</span> },
    { header: "FY", cell: (r) => r.fy },
    { header: "Posted By", cell: (r) => <div className="text-sm"><div>{r.postedBy}</div><div className="text-xs text-muted-foreground">{formatDate(r.postedOn)}</div></div> },
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
    <InventoryTable<OpeningStock>
      title="Opening Stock" description="Financial year opening balances by item & warehouse." icon={PlayCircle}
      data={OPENING_STOCK} columns={columns}
      searchable={(r) => `${r.itemCode} ${r.itemName} ${r.warehouse}`}
      kpis={[
        { label: "Entries", value: String(OPENING_STOCK.length) },
        { label: "Qty", value: String(OPENING_STOCK.reduce((s, o) => s + o.qty, 0)) },
        { label: "Value", value: formatINR(OPENING_STOCK.reduce((s, o) => s + o.value, 0)) },
        { label: "Financial Year", value: "FY 2025-26" },
      ]}
      newLabel="Import Opening"
    />
  );
}
