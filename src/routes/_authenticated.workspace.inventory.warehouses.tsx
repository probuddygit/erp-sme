import { createFileRoute } from "@tanstack/react-router";
import { Warehouse as WarehouseIcon, MoreHorizontal, Pencil, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { InventoryTable, type Column } from "@/features/inventory/components/InventoryTable";
import { StatusBadge } from "@/features/sales/components/StatusBadge";
import { WAREHOUSES, STATUS_TONES, formatNum, type Warehouse } from "@/features/inventory/data";

export const Route = createFileRoute("/_authenticated/workspace/inventory/warehouses")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const columns: Column<Warehouse>[] = [
    { header: "Code", cell: (r) => <span className="font-medium">{r.code}</span> },
    { header: "Warehouse", cell: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.city}, {r.state}</div></div> },
    { header: "Manager", cell: (r) => r.manager },
    { header: "Bins", align: "right", cell: (r) => r.bins },
    { header: "Capacity", align: "right", cell: (r) => formatNum(r.capacity) },
    { header: "Utilization", cell: (r) => (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className={r.utilization > 80 ? "h-full bg-rose-500" : r.utilization > 60 ? "h-full bg-amber-500" : "h-full bg-emerald-500"} style={{ width: `${r.utilization}%` }} />
        </div>
        <span className="text-xs">{r.utilization}%</span>
      </div>
    ) },
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
    <InventoryTable<Warehouse>
      title="Warehouses"
      description="Physical storage locations with capacity & manager."
      icon={WarehouseIcon}
      data={WAREHOUSES}
      columns={columns}
      searchable={(r) => `${r.code} ${r.name} ${r.city} ${r.manager}`}
      kpis={[
        { label: "Warehouses", value: String(WAREHOUSES.length) },
        { label: "Active", value: String(WAREHOUSES.filter((w) => w.status === "active").length) },
        { label: "Total Bins", value: String(WAREHOUSES.reduce((s, w) => s + w.bins, 0)) },
        { label: "Total Capacity", value: formatNum(WAREHOUSES.reduce((s, w) => s + w.capacity, 0)) },
      ]}
      newLabel="New Warehouse"
    />
  );
}
